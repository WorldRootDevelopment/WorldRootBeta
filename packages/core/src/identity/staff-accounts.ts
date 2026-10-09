import { toBadges, type BadgeKey } from '@worldroot/contracts';
import { auditLog, characters, communities, communityMembers, profiles, reports, roleAssignments, roles, scenePosts, sessions, users, type Db } from '@worldroot/db';
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import { recordAudit } from '../platform/audit';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { platformBadgesSql } from './badges';

const MAX_REASON = 500;

const requireStaff = (actor: Actor) => {
  if (actor.platformRole !== 'staff') throw new DomainError('forbidden', 'Only Rootwardens, the WorldRoot staff, can do that.');
};

async function requireUser(db: Db, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new DomainError('not_found', 'That account does not exist.');
  return user;
}

/** Whether an account is suspended, and why. Checked on every request the account makes. */
export async function getSuspension(db: Db, userId: string): Promise<{ since: Date; reason: string | null } | null> {
  const [user] = await db.select({ since: users.suspendedAt, reason: users.suspensionReason }).from(users).where(eq(users.id, userId));
  return user?.since ? { since: user.since, reason: user.reason } : null;
}

export interface StaffAccountView {
  userId: string;
  email: string;
  createdAt: Date;
  isStaff: boolean;
  suspendedAt: Date | null;
  suspensionReason: string | null;
  /** Null when the account has not finished setting up. */
  profile: { handle: string; displayName: string; avatarId: string | null; bannerId: string | null; status: string | null; lastSeenAt: Date | null } | null;
  badges: BadgeKey[];
  /** Devices signed in right now. */
  sessions: number;
  communities: Array<{ slug: string; name: string; owner: boolean }>;
  characters: number;
  posts: number;
  /** Reports about this person that nobody has dealt with yet. */
  openReports: number;
  /** What staff and community moderators have done to this account, newest first. */
  history: Array<{ action: string; at: Date; by: string | null }>;
}

/** Everything staff need to decide what to do about one account. Staff only. */
export async function getAccountForStaff(db: Db, actor: Actor, userId: string): Promise<StaffAccountView> {
  requireStaff(actor);
  const user = await requireUser(db, userId);
  const [profile] = await db.select({ profile: profiles, badges: platformBadgesSql }).from(profiles).where(eq(profiles.userId, userId));
  const one = async (query: Promise<Array<{ value: number }>>) => (await query)[0]?.value ?? 0;

  const [signedIn, cast, written, waiting, memberships, owned, history] = await Promise.all([
    one(db.select({ value: count() }).from(sessions).where(eq(sessions.userId, userId))),
    one(db.select({ value: count() }).from(characters).where(eq(characters.playerUserId, userId))),
    one(db.select({ value: count() }).from(scenePosts).where(and(eq(scenePosts.authorUserId, userId), isNull(scenePosts.removedAt)))),
    one(db.select({ value: count() }).from(reports).where(and(eq(reports.subjectUserId, userId), eq(reports.status, 'open')))),
    db
      .select({ id: communities.id, slug: communities.slug, name: communities.name })
      .from(communityMembers)
      .innerJoin(communities, eq(communities.id, communityMembers.communityId))
      .where(eq(communityMembers.userId, userId))
      .orderBy(asc(communities.name)),
    db
      .select({ communityId: roleAssignments.communityId })
      .from(roleAssignments)
      .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
      .where(and(eq(roleAssignments.userId, userId), eq(roles.isOwner, true))),
    db
      .select({ action: auditLog.action, at: auditLog.createdAt, by: profiles.handle })
      .from(auditLog)
      .leftJoin(profiles, eq(profiles.userId, auditLog.actorUserId))
      .where(and(eq(auditLog.targetType, 'user'), eq(auditLog.targetId, userId)))
      .orderBy(desc(auditLog.createdAt))
      .limit(20),
  ]);
  const owns = new Set(owned.map((row) => row.communityId));

  return {
    userId,
    email: user.email,
    createdAt: user.createdAt,
    isStaff: user.platformRole === 'staff',
    suspendedAt: user.suspendedAt,
    suspensionReason: user.suspensionReason,
    profile: profile
      ? {
          handle: profile.profile.handle,
          displayName: profile.profile.displayName,
          avatarId: profile.profile.avatarMediaId,
          bannerId: profile.profile.bannerMediaId,
          status: profile.profile.status,
          lastSeenAt: profile.profile.lastSeenAt,
        }
      : null,
    badges: toBadges(profile?.badges ?? [user.platformRole === 'staff' ? 'staff' : null, user.premiumSince ? 'premium' : null]),
    sessions: signedIn,
    communities: memberships.map((row) => ({ slug: row.slug, name: row.name, owner: owns.has(row.id) })),
    characters: cast,
    posts: written,
    openReports: waiting,
    history,
  };
}

/**
 * Suspends an account: it is signed out everywhere, and until it is restored
 * every page and every request is refused. Nothing the person wrote is
 * removed. Staff cannot suspend themselves or another member of staff.
 */
export async function suspendAccount(db: Db, actor: Actor, userId: string, reason: unknown): Promise<void> {
  requireStaff(actor);
  const user = await requireUser(db, userId);
  if (userId === actor.userId) throw new DomainError('invalid_input', 'You cannot suspend your own account.');
  if (user.platformRole === 'staff') throw new DomainError('forbidden', 'A Rootwarden cannot be suspended from here. Their role must be removed first.');
  const why = typeof reason === 'string' ? reason.trim() : '';
  if (!why) throw new DomainError('invalid_input', 'Say why, for the record.', { fields: { reason: 'Say why, for the record.' } });
  if (why.length > MAX_REASON) throw new DomainError('invalid_input', `Use at most ${MAX_REASON} characters.`, { fields: { reason: `Use at most ${MAX_REASON} characters.` } });

  await db.transaction(async (tx) => {
    await tx.update(users).set({ suspendedAt: new Date(), suspensionReason: why }).where(eq(users.id, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await recordAudit(tx, { actor, action: 'platform.account.suspend', targetType: 'user', targetId: userId, after: { reason: why } });
  });
}

/** Lifts a suspension. The person can sign in again and everything of theirs is as they left it. */
export async function restoreAccount(db: Db, actor: Actor, userId: string): Promise<void> {
  requireStaff(actor);
  const user = await requireUser(db, userId);
  if (!user.suspendedAt) return;
  await db.transaction(async (tx) => {
    await tx.update(users).set({ suspendedAt: null, suspensionReason: null }).where(eq(users.id, userId));
    await recordAudit(tx, { actor, action: 'platform.account.restore', targetType: 'user', targetId: userId, before: { reason: user.suspensionReason } });
  });
}

/** Signs an account out of every device, for when it may be in the wrong hands. Returns how many devices were signed out. */
export async function signOutAccount(db: Db, actor: Actor, userId: string): Promise<number> {
  requireStaff(actor);
  await requireUser(db, userId);
  return db.transaction(async (tx) => {
    const ended = await tx.delete(sessions).where(eq(sessions.userId, userId)).returning({ id: sessions.id });
    await recordAudit(tx, { actor, action: 'platform.account.sign_out', targetType: 'user', targetId: userId, after: { sessions: ended.length } });
    return ended.length;
  });
}
