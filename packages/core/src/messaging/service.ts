import type { PermissionKey } from '@worldroot/contracts';
import { communities, conversationMembers, conversations, messages, profiles, type Db } from '@worldroot/db';
import { and, desc, eq, inArray, lt, ne, sql } from 'drizzle-orm';
import { communityGrants, isMember } from '../community/service';
import { recordAudit } from '../platform/audit';
import { can, type Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { emitEvent } from '../platform/outbox';

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;

export const SPACES = {
  announcements: { label: 'Announcements', post: 'announcement.post' },
  lounge: { label: 'Lounge', post: 'lounge.post' },
} as const satisfies Record<string, { label: string; post: PermissionKey }>;

export type SpaceKey = keyof typeof SPACES;

export const MAX_MESSAGE_CHARACTERS = 4_000;
export const MAX_GROUP_SIZE = 12;

const missing = () => new DomainError('not_found', 'That conversation does not exist.');

/** A community's built-in space, created the first time it is needed. */
async function ensureSpace(db: Db, communityId: string, spaceKey: SpaceKey): Promise<Conversation> {
  const where = and(eq(conversations.communityId, communityId), eq(conversations.spaceKey, spaceKey));
  const [existing] = await db.select().from(conversations).where(where);
  if (existing) return existing;
  await db.insert(conversations).values({ kind: 'community', communityId, spaceKey }).onConflictDoNothing();
  const [created] = await db.select().from(conversations).where(where);
  return created!;
}

interface Access {
  conversation: Conversation;
  canPost: boolean;
  /** May remove other people's messages here. */
  canModerate: boolean;
}

/**
 * Who may see and write in a conversation. A community space follows the
 * community: anyone who can see the community reads it, and its roles decide
 * who posts. A direct or group conversation belongs to its members alone.
 */
async function accessOf(db: Db, actor: Actor, conversation: Conversation): Promise<Access> {
  if (conversation.kind === 'community') {
    const [community] = await db.select().from(communities).where(eq(communities.id, conversation.communityId!));
    const staff = actor.platformRole === 'staff';
    const visible = community && (community.listed || staff || (await isMember(db, actor.userId, community.id)));
    if (!community || !visible) throw missing();
    const resource = { communityId: community.id };
    const grants = communityGrants(db);
    return {
      conversation,
      canPost: await can(actor, SPACES[conversation.spaceKey as SpaceKey].post, resource, grants),
      canModerate: await can(actor, 'message.remove', resource, grants),
    };
  }
  const [membership] = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversation.id), eq(conversationMembers.userId, actor.userId)));
  if (!membership) throw missing();
  return { conversation, canPost: true, canModerate: false };
}

async function requireAccess(db: Db, actor: Actor, conversationId: string): Promise<Access> {
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!conversation) throw missing();
  return accessOf(db, actor, conversation);
}

/** Opens one of a community's spaces for the actor. */
export async function getSpace(db: Db, actor: Actor, communityId: string, spaceKey: SpaceKey): Promise<Access> {
  return accessOf(db, actor, await ensureSpace(db, communityId, spaceKey));
}

async function userIdsForHandles(db: Db, handles: string[]): Promise<string[]> {
  const clean = [...new Set(handles.map((handle) => handle.trim().replace(/^@/, '').toLowerCase()).filter(Boolean))];
  if (clean.length === 0) throw new DomainError('invalid_input', 'Enter a handle.', { fields: { handles: 'Enter a handle.' } });
  const found = await db.select({ userId: profiles.userId, handleLower: profiles.handleLower }).from(profiles).where(inArray(profiles.handleLower, clean));
  const unknown = clean.filter((handle) => !found.some((row) => row.handleLower === handle));
  if (unknown.length > 0) {
    const message = `No one has the handle ${unknown.map((handle) => `@${handle}`).join(', ')}.`;
    throw new DomainError('not_found', message, { fields: { handles: message } });
  }
  return found.map((row) => row.userId);
}

/**
 * Starts a conversation with one or more people, by handle. One other person
 * gives the single direct conversation that pair shares; more gives a new group.
 */
export async function startConversation(db: Db, actor: Actor, input: { handles: string[]; title?: string | null }): Promise<Conversation> {
  const others = (await userIdsForHandles(db, input.handles)).filter((userId) => userId !== actor.userId);
  if (others.length === 0) throw new DomainError('invalid_input', 'Choose someone other than yourself.', { fields: { handles: 'Choose someone other than yourself.' } });
  if (others.length + 1 > MAX_GROUP_SIZE) {
    const message = `A group holds at most ${MAX_GROUP_SIZE} people. Larger groups are communities.`;
    throw new DomainError('invalid_input', message, { fields: { handles: message } });
  }

  return db.transaction(async (tx) => {
    if (others.length === 1) {
      const directKey = [actor.userId, others[0]!].sort().join(':');
      const [existing] = await tx.select().from(conversations).where(eq(conversations.directKey, directKey));
      if (existing) return existing;
      const [direct] = await tx.insert(conversations).values({ kind: 'direct', directKey, createdByUserId: actor.userId }).returning();
      await tx.insert(conversationMembers).values([actor.userId, others[0]!].map((userId) => ({ conversationId: direct!.id, userId })));
      return direct!;
    }
    const [group] = await tx
      .insert(conversations)
      .values({ kind: 'group', title: input.title?.trim().slice(0, 80) || null, createdByUserId: actor.userId })
      .returning();
    await tx.insert(conversationMembers).values([actor.userId, ...others].map((userId) => ({ conversationId: group!.id, userId })));
    return group!;
  });
}

/** Sends a message. */
export async function sendMessage(db: Db, actor: Actor, conversationId: string, body: unknown): Promise<Message> {
  const access = await requireAccess(db, actor, conversationId);
  if (!access.canPost) {
    const space = SPACES[access.conversation.spaceKey as SpaceKey];
    throw new DomainError('forbidden', `You cannot post in ${space.label}.`, { permission: space.post });
  }
  const text = typeof body === 'string' ? body.replace(/\r\n?/g, '\n').trim() : '';
  if (!text) throw new DomainError('invalid_input', 'Write a message first.', { fields: { body: 'Write a message first.' } });
  if (text.length > MAX_MESSAGE_CHARACTERS) {
    const message = `Keep it under ${MAX_MESSAGE_CHARACTERS.toLocaleString('en')} characters.`;
    throw new DomainError('invalid_input', message, { fields: { body: message } });
  }

  return db.transaction(async (tx) => {
    const [message] = await tx.insert(messages).values({ conversationId, authorUserId: actor.userId, body: text }).returning();
    await tx.update(conversations).set({ lastMessageId: message!.id, lastMessageAt: message!.createdAt }).where(eq(conversations.id, conversationId));
    // Your own message is, by definition, read.
    await tx
      .insert(conversationMembers)
      .values({ conversationId, userId: actor.userId, lastReadMessageId: message!.id })
      .onConflictDoUpdate({ target: [conversationMembers.conversationId, conversationMembers.userId], set: { lastReadMessageId: message!.id } });
    await emitEvent(tx, 'message.created', { conversationId, messageId: message!.id });
    return message!;
  });
}

/**
 * Removes a message, leaving a marker. Its author may, and in a community
 * space so may anyone who holds "Remove messages".
 */
export async function removeMessage(db: Db, actor: Actor, messageId: string): Promise<{ conversationId: string }> {
  const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
  if (!message) throw new DomainError('not_found', 'That message does not exist.');
  const access = await requireAccess(db, actor, message.conversationId);
  const result = { conversationId: message.conversationId };
  if (message.removedAt) return result;
  const own = message.authorUserId === actor.userId;
  if (!own && !access.canModerate) {
    throw new DomainError('forbidden', 'Only its author can remove this message.', access.conversation.communityId ? { permission: 'message.remove' } : {});
  }

  await db.transaction(async (tx) => {
    await tx.update(messages).set({ removedAt: new Date(), removedByUserId: actor.userId }).where(eq(messages.id, messageId));
    if (!own) {
      await recordAudit(tx, {
        actor,
        action: 'message.remove',
        targetType: 'message',
        targetId: messageId,
        communityId: access.conversation.communityId,
        before: { authorUserId: message.authorUserId, space: access.conversation.spaceKey },
      });
    }
  });
  return result;
}

export interface MessageRow {
  id: string;
  body: string;
  authorName: string | null;
  authorHandle: string | null;
  mine: boolean;
  /** Who removed it, when it has been removed. Its words are then withheld. */
  removedBy: 'author' | 'moderator' | null;
  createdAt: Date;
}

export interface MessagePage {
  conversation: Conversation;
  messages: MessageRow[];
  hasEarlier: boolean;
  canPost: boolean;
  canModerate: boolean;
}

/** A page of a conversation, oldest first. */
export async function listMessages(db: Db, actor: Actor, conversationId: string, options: { beforeId?: string; limit?: number } = {}): Promise<MessagePage> {
  const access = await requireAccess(db, actor, conversationId);
  const limit = Math.min(options.limit ?? 50, 100);
  const rows = await db
    .select({ message: messages, authorName: profiles.displayName, authorHandle: profiles.handle })
    .from(messages)
    .leftJoin(profiles, eq(profiles.userId, messages.authorUserId))
    .where(and(eq(messages.conversationId, conversationId), options.beforeId ? lt(messages.id, options.beforeId) : undefined))
    .orderBy(desc(messages.id))
    .limit(limit + 1);

  return {
    ...access,
    hasEarlier: rows.length > limit,
    messages: rows
      .slice(0, limit)
      .reverse()
      .map(({ message, authorName, authorHandle }) => ({
        id: message.id,
        body: message.removedAt ? '' : message.body,
        authorName,
        authorHandle,
        mine: message.authorUserId === actor.userId,
        removedBy: message.removedAt ? (message.removedByUserId === message.authorUserId ? 'author' : 'moderator') : null,
        createdAt: message.createdAt,
      })),
  };
}

/** Records that the actor has read up to the newest message. */
export async function markConversationRead(db: Db, actor: Actor, conversationId: string): Promise<void> {
  const { conversation } = await requireAccess(db, actor, conversationId);
  if (!conversation.lastMessageId) return;
  await db
    .insert(conversationMembers)
    .values({ conversationId, userId: actor.userId, lastReadMessageId: conversation.lastMessageId })
    .onConflictDoUpdate({
      target: [conversationMembers.conversationId, conversationMembers.userId],
      set: { lastReadMessageId: conversation.lastMessageId },
    });
}

export interface ConversationSummary {
  id: string;
  kind: 'direct' | 'group';
  /** The other person's name, or the group's name or member list. */
  title: string;
  people: Array<{ userId: string; displayName: string; handle: string }>;
  lastMessage: { body: string; authorName: string | null; mine: boolean; createdAt: Date } | null;
  unread: boolean;
}

const nameConversation = (conversation: Conversation, others: ConversationSummary['people']): string =>
  conversation.title || others.map((person) => person.displayName).join(', ') || 'Just you';

/** The actor's direct and group conversations, most recently active first. */
export async function listConversations(db: Db, actor: Actor): Promise<ConversationSummary[]> {
  const mine = await db
    .select({ conversation: conversations, lastReadMessageId: conversationMembers.lastReadMessageId })
    .from(conversationMembers)
    .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
    .where(and(eq(conversationMembers.userId, actor.userId), ne(conversations.kind, 'community')))
    .orderBy(sql`${conversations.lastMessageAt} desc nulls last`, desc(conversations.createdAt));
  if (mine.length === 0) return [];

  const ids = mine.map((row) => row.conversation.id);
  const people = await db
    .select({ conversationId: conversationMembers.conversationId, userId: profiles.userId, displayName: profiles.displayName, handle: profiles.handle })
    .from(conversationMembers)
    .innerJoin(profiles, eq(profiles.userId, conversationMembers.userId))
    .where(inArray(conversationMembers.conversationId, ids));
  const lastIds = mine.flatMap((row) => (row.conversation.lastMessageId ? [row.conversation.lastMessageId] : []));
  const last = lastIds.length
    ? await db
        .select({ message: messages, authorName: profiles.displayName })
        .from(messages)
        .leftJoin(profiles, eq(profiles.userId, messages.authorUserId))
        .where(inArray(messages.id, lastIds))
    : [];

  return mine.map(({ conversation, lastReadMessageId }) => {
    const others = people
      .filter((person) => person.conversationId === conversation.id && person.userId !== actor.userId)
      .map(({ userId, displayName, handle }) => ({ userId, displayName, handle }));
    const latest = last.find((row) => row.message.id === conversation.lastMessageId);
    return {
      id: conversation.id,
      kind: conversation.kind as 'direct' | 'group',
      title: nameConversation(conversation, others),
      people: others,
      lastMessage: latest
        ? {
            body: latest.message.removedAt ? 'Message removed' : latest.message.body,
            authorName: latest.authorName,
            mine: latest.message.authorUserId === actor.userId,
            createdAt: latest.message.createdAt,
          }
        : null,
      unread: Boolean(conversation.lastMessageId) && (!lastReadMessageId || conversation.lastMessageId! > lastReadMessageId),
    };
  });
}

/** One of the actor's direct or group conversations, with who is in it. */
export async function getConversationSummary(db: Db, actor: Actor, conversationId: string): Promise<ConversationSummary> {
  const summary = (await listConversations(db, actor)).find((conversation) => conversation.id === conversationId);
  if (!summary) throw missing();
  return summary;
}

/** How many of the actor's direct and group conversations have something new. */
export async function countUnreadConversations(db: Db, userId: string): Promise<number> {
  const rows = await db
    .select({ id: conversations.id })
    .from(conversationMembers)
    .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
    .where(
      and(
        eq(conversationMembers.userId, userId),
        ne(conversations.kind, 'community'),
        sql`${conversations.lastMessageId} is not null`,
        sql`(${conversationMembers.lastReadMessageId} is null or ${conversations.lastMessageId} > ${conversationMembers.lastReadMessageId})`,
      ),
    );
  return rows.length;
}

/** Whether the actor may follow a conversation's live updates. */
export async function canAccessConversation(db: Db, actor: Actor, conversationId: string): Promise<boolean> {
  return requireAccess(db, actor, conversationId).then(
    () => true,
    (error: unknown) => {
      if (error instanceof DomainError) return false;
      throw error;
    },
  );
}
