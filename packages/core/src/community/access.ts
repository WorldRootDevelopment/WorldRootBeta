import { randomBytes } from 'node:crypto';
import { communities, communityBans, communityInvites, communityMembers, profiles, roleAssignments, roles, type Db } from '@worldroot/db';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { recordAudit } from '../platform/audit';
import { authorize, resolvePermissions, type Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { emitEvent } from '../platform/outbox';
import { communityGrants, isMember } from './service';

export type Invite = typeof communityInvites.$inferSelect;

const MAX_INVITE_DAYS = 365;

export async function isBanned(db: Db, userId: string, communityId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: communityBans.userId })
    .from(communityBans)
    .where(and(eq(communityBans.communityId, communityId), eq(communityBans.userId, userId)));
  return Boolean(row);
}

/**
 * Makes someone a member and gives them the default role. Does nothing if they
 * already belong. Refuses anyone banned. Call inside a transaction.
 * Returns true when a membership was created.
 */
export async function addMember(tx: Db, communityId: string, userId: string): Promise<boolean> {
  if (await isBanned(tx, userId, communityId)) throw new DomainError('forbidden', 'You cannot join this community.');
  if (await isMember(tx, userId, communityId)) return false;
  const [community] = await tx.select({ archivedAt: communities.archivedAt }).from(communities).where(eq(communities.id, communityId));
  if (community?.archivedAt) throw new DomainError('conflict', 'This community is archived and is not taking new members.');

  await tx.insert(communityMembers).values({ communityId, userId });
  const defaults = await tx
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.communityId, communityId), eq(roles.isDefault, true)));
  if (defaults.length > 0) {
    await tx.insert(roleAssignments).values(defaults.map((role) => ({ communityId, userId, roleId: role.id })));
  }
  await emitEvent(tx, 'community.member_joined', { communityId, userId });
  return true;
}

export interface CreateInviteInput {
  /** How many people may use the link. Omit for no limit. */
  maxUses?: number | null;
  /** Days until the link stops working. Omit for a link that does not expire. */
  expiresInDays?: number | null;
}

const wholeNumber = (value: number | null | undefined, max: number, name: string): number | null => {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new DomainError('invalid_input', `${name} must be a whole number from 1 to ${max}.`);
  }
  return value;
};

/** Creates an invite link for a community. */
export async function createInvite(db: Db, actor: Actor, communityId: string, input: CreateInviteInput = {}): Promise<Invite> {
  await authorize(actor, 'community.invite', { communityId }, communityGrants(db));
  const maxUses = wholeNumber(input.maxUses, 10_000, 'The number of uses');
  const days = wholeNumber(input.expiresInDays, MAX_INVITE_DAYS, 'The number of days');

  return db.transaction(async (tx) => {
    const [invite] = await tx
      .insert(communityInvites)
      .values({
        communityId,
        // 72 random bits, URL-safe. Guessing one is not practical.
        code: randomBytes(9).toString('base64url'),
        createdByUserId: actor.userId,
        maxUses,
        expiresAt: days ? new Date(Date.now() + days * 86_400_000) : null,
      })
      .returning();
    await recordAudit(tx, {
      actor,
      action: 'invite.create',
      targetType: 'invite',
      targetId: invite!.id,
      communityId,
      after: { maxUses, expiresInDays: days },
    });
    return invite!;
  });
}

const inviteState = (invite: Invite): 'active' | 'revoked' | 'expired' | 'used_up' =>
  invite.revokedAt
    ? 'revoked'
    : invite.expiresAt && invite.expiresAt.getTime() <= Date.now()
      ? 'expired'
      : invite.maxUses !== null && invite.uses >= invite.maxUses
        ? 'used_up'
        : 'active';

export type InviteRow = Invite & { state: ReturnType<typeof inviteState>; createdByHandle: string | null };

/** A community's invite links, newest first, each with whether it still works. */
export async function listInvites(db: Db, actor: Actor, communityId: string): Promise<InviteRow[]> {
  await authorize(actor, 'community.invite', { communityId }, communityGrants(db));
  const rows = await db
    .select({ invite: communityInvites, createdByHandle: profiles.handle })
    .from(communityInvites)
    .leftJoin(profiles, eq(profiles.userId, communityInvites.createdByUserId))
    .where(eq(communityInvites.communityId, communityId))
    .orderBy(desc(communityInvites.id))
    .limit(100);
  return rows.map(({ invite, createdByHandle }) => ({ ...invite, state: inviteState(invite), createdByHandle }));
}

/** Stops an invite link working. People who already joined with it stay. */
export async function revokeInvite(db: Db, actor: Actor, inviteId: string): Promise<void> {
  const [invite] = await db.select().from(communityInvites).where(eq(communityInvites.id, inviteId));
  if (!invite) throw new DomainError('not_found', 'That invite does not exist.');
  await authorize(actor, 'community.invite', { communityId: invite.communityId }, communityGrants(db));
  if (invite.revokedAt) return;
  await db.transaction(async (tx) => {
    await tx.update(communityInvites).set({ revokedAt: new Date() }).where(eq(communityInvites.id, inviteId));
    await recordAudit(tx, { actor, action: 'invite.revoke', targetType: 'invite', targetId: inviteId, communityId: invite.communityId });
  });
}

export interface InvitePreview {
  community: { id: string; slug: string; name: string; tagline: string | null; accentHue: number; memberCount: number };
  /** Whether the link can be used right now. */
  usable: boolean;
  alreadyMember: boolean;
}

const badInvite = () => new DomainError('not_found', 'This invite link is not valid. Ask for a new one.');

/** What an invite link leads to, for the person holding it. An unknown code tells them nothing. */
export async function getInvitePreview(db: Db, actor: Actor, code: string): Promise<InvitePreview> {
  const [row] = await db
    .select({ invite: communityInvites, community: communities })
    .from(communityInvites)
    .innerJoin(communities, eq(communities.id, communityInvites.communityId))
    .where(eq(communityInvites.code, code));
  if (!row) throw badInvite();
  const [members] = await db.select({ value: count() }).from(communityMembers).where(eq(communityMembers.communityId, row.community.id));
  const { id, slug, name, tagline, accentHue } = row.community;
  return {
    community: { id, slug, name, tagline, accentHue, memberCount: members?.value ?? 0 },
    usable: inviteState(row.invite) === 'active' && !(await isBanned(db, actor.userId, id)),
    alreadyMember: await isMember(db, actor.userId, id),
  };
}

/** Joins a community with an invite link. Returns the community's address. */
export async function acceptInvite(db: Db, actor: Actor, code: string): Promise<{ slug: string }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ invite: communityInvites, slug: communities.slug })
      .from(communityInvites)
      .innerJoin(communities, eq(communities.id, communityInvites.communityId))
      .where(eq(communityInvites.code, code));
    if (!row) throw badInvite();
    if (await isMember(tx, actor.userId, row.invite.communityId)) return { slug: row.slug };
    if (inviteState(row.invite) !== 'active') throw new DomainError('conflict', 'This invite link no longer works. Ask for a new one.');

    // Counted in the same statement that checks the limit, so two people cannot both take the last use.
    const claimed = await tx
      .update(communityInvites)
      .set({ uses: sql`${communityInvites.uses} + 1` })
      .where(
        and(
          eq(communityInvites.id, row.invite.id),
          isNull(communityInvites.revokedAt),
          sql`(${communityInvites.maxUses} is null or ${communityInvites.uses} < ${communityInvites.maxUses})`,
        ),
      )
      .returning({ id: communityInvites.id });
    if (claimed.length === 0) throw new DomainError('conflict', 'This invite link no longer works. Ask for a new one.');

    await addMember(tx, row.invite.communityId, actor.userId);
    return { slug: row.slug };
  });
}

/** The highest role position a person holds in a community, or -1. */
async function rankOf(db: Db, userId: string, communityId: string): Promise<number> {
  const held = await db
    .select({ position: roles.position })
    .from(roleAssignments)
    .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
    .where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.communityId, communityId)));
  return Math.max(-1, ...held.map((role) => role.position));
}

/**
 * Removes someone from a community and stops them rejoining, by link or otherwise.
 * Their characters and posts stay. Only someone who outranks them may.
 */
export async function banMember(db: Db, actor: Actor, communityId: string, userId: string, reason?: string | null): Promise<void> {
  await authorize(actor, 'member.ban', { communityId }, communityGrants(db));
  if (userId === actor.userId) throw new DomainError('forbidden', 'You cannot ban yourself.');
  if (actor.platformRole !== 'staff' && (await rankOf(db, userId, communityId)) >= (await rankOf(db, actor.userId, communityId))) {
    throw new DomainError('forbidden', 'You can only ban members ranked below you.');
  }
  const note = reason?.trim().slice(0, 500) || null;

  await db.transaction(async (tx) => {
    const added = await tx
      .insert(communityBans)
      .values({ communityId, userId, bannedByUserId: actor.userId, reason: note })
      .onConflictDoNothing()
      .returning({ userId: communityBans.userId });
    await tx.delete(roleAssignments).where(and(eq(roleAssignments.communityId, communityId), eq(roleAssignments.userId, userId)));
    await tx.delete(communityMembers).where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)));
    if (added.length > 0) {
      await recordAudit(tx, { actor, action: 'member.ban', targetType: 'user', targetId: userId, communityId, after: { reason: note } });
    }
  });
}

/** Lifts a ban. The person may join again; they are not re-added. */
export async function unbanMember(db: Db, actor: Actor, communityId: string, userId: string): Promise<void> {
  await authorize(actor, 'member.ban', { communityId }, communityGrants(db));
  await db.transaction(async (tx) => {
    const removed = await tx
      .delete(communityBans)
      .where(and(eq(communityBans.communityId, communityId), eq(communityBans.userId, userId)))
      .returning({ userId: communityBans.userId });
    if (removed.length > 0) await recordAudit(tx, { actor, action: 'member.unban', targetType: 'user', targetId: userId, communityId });
  });
}

export interface BanRow {
  userId: string;
  displayName: string | null;
  handle: string | null;
  reason: string | null;
  createdAt: Date;
}

export async function listBans(db: Db, actor: Actor, communityId: string): Promise<BanRow[]> {
  const grants = await communityGrants(db).getGrants(actor.userId, communityId);
  if (actor.platformRole !== 'staff' && !resolvePermissions(grants).has('member.ban')) return [];
  return db
    .select({
      userId: communityBans.userId,
      displayName: profiles.displayName,
      handle: profiles.handle,
      reason: communityBans.reason,
      createdAt: communityBans.createdAt,
    })
    .from(communityBans)
    .leftJoin(profiles, eq(profiles.userId, communityBans.userId))
    .where(eq(communityBans.communityId, communityId))
    .orderBy(desc(communityBans.createdAt));
}
