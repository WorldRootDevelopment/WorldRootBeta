import { channelInputSchema, MAX_CHANNELS, type ChannelInput } from '@worldroot/contracts';
import { communities, communityChannels, conversationMembers, conversations, roles, type Db } from '@worldroot/db';
import { and, asc, count, eq, inArray, max } from 'drizzle-orm';
import { assertCommunityOpen } from '../worlds/service';
import { communityGrants } from '../community/service';
import { recordAudit } from '../platform/audit';
import { authorize, type Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { parseInput } from '../platform/validate';
import { ensureLounge, openConversation, type ConversationAccess } from './service';

/**
 * Chat channels: a community's rooms for talking out of character. Each is a
 * named conversation in the same engine as direct messages, so everything a
 * conversation can do, a channel can.
 *
 * A community always has at least one. The Lounge it was created with is its
 * first channel, and keeps every message that was in it.
 */
export type Channel = typeof communityChannels.$inferSelect;

export interface ChannelSummary {
  id: string;
  name: string;
  topic: string | null;
  category: string | null;
  conversationId: string;
  canPost: boolean;
  /** Only some roles can see it. */
  restricted: boolean;
  /** Only some roles can post in it. */
  postRestricted: boolean;
  /** Messages have arrived since the viewer last read it. */
  unread: boolean;
}

/**
 * Makes sure a community has its channels. One made before channels existed has only its Lounge;
 * this gives that Lounge a channel of its own, so nothing said there is lost. Safe to call again.
 */
export async function ensureChannels(db: Db, communityId: string): Promise<void> {
  const [existing] = await db.select({ value: count() }).from(communityChannels).where(eq(communityChannels.communityId, communityId));
  if ((existing?.value ?? 0) > 0) return;
  const lounge = await ensureLounge(db, communityId);
  await db.insert(communityChannels).values({ communityId, conversationId: lounge.id, name: 'lounge', topic: 'Talk about anything.', position: 0 }).onConflictDoNothing();
}

/** The channels the actor may see in a community, in order, with whether each holds something new for them. */
export async function listChannels(db: Db, actor: Actor, communityId: string): Promise<ChannelSummary[]> {
  await ensureChannels(db, communityId);
  const rows = await db
    .select({ channel: communityChannels, lastMessageId: conversations.lastMessageId })
    .from(communityChannels)
    .innerJoin(conversations, eq(conversations.id, communityChannels.conversationId))
    .where(eq(communityChannels.communityId, communityId))
    .orderBy(asc(communityChannels.position), asc(communityChannels.createdAt));
  if (rows.length === 0) return [];

  const read = await db
    .select({ conversationId: conversationMembers.conversationId, lastReadMessageId: conversationMembers.lastReadMessageId })
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.userId, actor.userId),
        inArray(
          conversationMembers.conversationId,
          rows.map((row) => row.channel.conversationId),
        ),
      ),
    );
  const readUpTo = new Map(read.map((row) => [row.conversationId, row.lastReadMessageId]));

  const visible: ChannelSummary[] = [];
  for (const { channel, lastMessageId } of rows) {
    // Whether the actor may see it is decided in one place, the same one that guards its messages.
    const access = await openConversation(db, actor, channel.conversationId).catch(() => null);
    if (!access) continue;
    const opened = readUpTo.has(channel.conversationId);
    const seen = readUpTo.get(channel.conversationId);
    visible.push({
      id: channel.id,
      name: channel.name,
      topic: channel.topic,
      category: channel.category,
      conversationId: channel.conversationId,
      canPost: access.canPost,
      restricted: Boolean(channel.readRoleIds),
      postRestricted: Boolean(channel.postRoleIds),
      // Message ids are time-ordered, so anything later than the last one read is new. A channel never opened is not nagged about.
      unread: Boolean(lastMessageId && opened && (!seen || lastMessageId > seen)),
    });
  }
  return visible;
}

/** Opens one channel by name for the actor. Refused, as if it did not exist, for anyone who may not see it. */
export async function getChannel(db: Db, actor: Actor, communityId: string, name: string): Promise<{ channel: Channel; access: ConversationAccess }> {
  await ensureChannels(db, communityId);
  const [channel] = await db
    .select()
    .from(communityChannels)
    .where(and(eq(communityChannels.communityId, communityId), eq(communityChannels.name, name.toLowerCase())));
  if (!channel) throw new DomainError('not_found', 'That channel does not exist.');
  return { channel, access: await openConversation(db, actor, channel.conversationId) };
}

/** Every channel in a community with its settings, for the people who manage them. */
export async function listChannelsForAdmin(db: Db, actor: Actor, communityId: string): Promise<Channel[]> {
  await authorize(actor, 'community.manage', { communityId }, communityGrants(db));
  await ensureChannels(db, communityId);
  return db.select().from(communityChannels).where(eq(communityChannels.communityId, communityId)).orderBy(asc(communityChannels.position), asc(communityChannels.createdAt));
}

/** Checks that every role named belongs to this community. A role from elsewhere would silently lock everyone out. */
async function checkRoles(db: Db, communityId: string, ...lists: Array<string[] | null>): Promise<void> {
  const wanted = [...new Set(lists.flatMap((list) => list ?? []))];
  if (wanted.length === 0) return;
  const found = await db.select({ id: roles.id }).from(roles).where(and(eq(roles.communityId, communityId), inArray(roles.id, wanted)));
  if (found.length !== wanted.length) throw new DomainError('invalid_input', 'Choose roles from this community.');
}

const taken = () => new DomainError('conflict', 'A channel here already has that name.', { fields: { name: 'A channel here already has that name.' } });

/** Adds a channel to a community, at the end of the list. */
export async function createChannel(db: Db, actor: Actor, communityId: string, input: ChannelInput): Promise<Channel> {
  await authorize(actor, 'community.manage', { communityId }, communityGrants(db));
  await assertCommunityOpen(db, communityId);
  const values = parseInput(channelInputSchema, input);
  await ensureChannels(db, communityId);
  await checkRoles(db, communityId, values.readRoleIds, values.postRoleIds);

  return db.transaction(async (tx) => {
    const [held] = await tx.select({ value: count(), last: max(communityChannels.position) }).from(communityChannels).where(eq(communityChannels.communityId, communityId));
    if ((held?.value ?? 0) >= MAX_CHANNELS) throw new DomainError('conflict', `A community can have ${MAX_CHANNELS} channels. Remove one to add another.`);
    const [same] = await tx.select({ id: communityChannels.id }).from(communityChannels).where(and(eq(communityChannels.communityId, communityId), eq(communityChannels.name, values.name)));
    if (same) throw taken();

    const [conversation] = await tx.insert(conversations).values({ kind: 'community', communityId, createdByUserId: actor.userId }).returning();
    // The space key ties the conversation to its community uniquely; for a channel it is derived from the conversation itself.
    await tx.update(conversations).set({ spaceKey: `channel:${conversation!.id}` }).where(eq(conversations.id, conversation!.id));
    const [channel] = await tx
      .insert(communityChannels)
      .values({ communityId, conversationId: conversation!.id, ...values, position: (held?.last ?? -1) + 1 })
      .returning();
    await recordAudit(tx, { actor, action: 'channel.create', targetType: 'channel', targetId: channel!.id, communityId, after: { name: channel!.name } });
    return channel!;
  });
}

async function requireChannel(db: Db, actor: Actor, channelId: string): Promise<Channel> {
  const [channel] = await db.select().from(communityChannels).where(eq(communityChannels.id, channelId));
  if (!channel) throw new DomainError('not_found', 'That channel does not exist.');
  await authorize(actor, 'community.manage', { communityId: channel.communityId }, communityGrants(db));
  return channel;
}

/** Changes a channel's name, topic, heading or who may use it. */
export async function updateChannel(db: Db, actor: Actor, channelId: string, input: ChannelInput): Promise<Channel> {
  const channel = await requireChannel(db, actor, channelId);
  await assertCommunityOpen(db, channel.communityId);
  const values = parseInput(channelInputSchema, input);
  await checkRoles(db, channel.communityId, values.readRoleIds, values.postRoleIds);

  return db.transaction(async (tx) => {
    const [same] = await tx
      .select({ id: communityChannels.id })
      .from(communityChannels)
      .where(and(eq(communityChannels.communityId, channel.communityId), eq(communityChannels.name, values.name)));
    if (same && same.id !== channelId) throw taken();
    const [updated] = await tx.update(communityChannels).set(values).where(eq(communityChannels.id, channelId)).returning();
    await recordAudit(tx, { actor, action: 'channel.update', targetType: 'channel', targetId: channelId, communityId: channel.communityId, before: { name: channel.name }, after: { name: updated!.name } });
    return updated!;
  });
}

/** Moves a channel one place up or down the list. At either end it stays where it is. */
export async function moveChannel(db: Db, actor: Actor, channelId: string, direction: 'up' | 'down'): Promise<void> {
  const channel = await requireChannel(db, actor, channelId);
  await db.transaction(async (tx) => {
    const ordered = await tx
      .select({ id: communityChannels.id })
      .from(communityChannels)
      .where(eq(communityChannels.communityId, channel.communityId))
      .orderBy(asc(communityChannels.position), asc(communityChannels.createdAt));
    const at = ordered.findIndex((row) => row.id === channelId);
    const to = direction === 'up' ? at - 1 : at + 1;
    if (at < 0 || to < 0 || to >= ordered.length) return;
    [ordered[at], ordered[to]] = [ordered[to]!, ordered[at]!];
    // Renumbered in full, so positions stay tidy whatever they were before.
    for (const [position, row] of ordered.entries()) await tx.update(communityChannels).set({ position }).where(eq(communityChannels.id, row.id));
  });
}

/**
 * Deletes a channel and every message in it, for good. A community keeps at
 * least one channel, so the last cannot be deleted.
 */
export async function deleteChannel(db: Db, actor: Actor, channelId: string): Promise<void> {
  const channel = await requireChannel(db, actor, channelId);
  await db.transaction(async (tx) => {
    const [held] = await tx.select({ value: count() }).from(communityChannels).where(eq(communityChannels.communityId, channel.communityId));
    if ((held?.value ?? 0) <= 1) throw new DomainError('conflict', 'A community keeps at least one channel. Add another before deleting this one.');
    // Deleting the conversation takes its messages and the channel row with it.
    await tx.delete(conversations).where(eq(conversations.id, channel.conversationId));
    await recordAudit(tx, { actor, action: 'channel.delete', targetType: 'channel', targetId: channelId, communityId: channel.communityId, before: { name: channel.name } });
  });
}

/** Where a channel lives, for a link to it. Null if the conversation is not a channel. */
export async function channelAddress(db: Db, conversationId: string): Promise<{ name: string; communitySlug: string; communityName: string } | null> {
  const [row] = await db
    .select({ name: communityChannels.name, communitySlug: communities.slug, communityName: communities.name })
    .from(communityChannels)
    .innerJoin(communities, eq(communities.id, communityChannels.communityId))
    .where(eq(communityChannels.conversationId, conversationId));
  return row ?? null;
}
