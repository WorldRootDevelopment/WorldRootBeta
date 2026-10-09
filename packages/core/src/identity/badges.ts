import { BADGES, isBadgeKey, toBadges, type BadgeKey, type CommunityBadgeKey, type PermissionKey } from '@worldroot/contracts';
import { profiles, userBadges, users, type Db } from '@worldroot/db';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { notify } from '../notifications/service';
import { recordAudit } from '../platform/audit';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';

/**
 * A person's platform badges, for use in any query that selects from
 * `profiles`. Staff and Heartwood come from the account itself; the rest are
 * rows in user_badges. Null when the profile side of a left join is missing.
 */
export const platformBadgesSql = sql<string[] | null>`(
  select array_remove(array[
    case when u.platform_role = 'staff' then 'staff' end,
    case when u.premium_since is not null then 'premium' end
  ], null)::text[] || array(select b.badge from user_badges b where b.user_id = u.id order by b.badge)::text[]
  from users u where u.id = ${profiles.userId}
)`;

export { toBadges };

const ADMIN_KEYS: PermissionKey[] = ['community.manage', 'role.manage'];
const MODERATOR_KEYS: PermissionKey[] = ['post.remove', 'message.remove', 'report.review', 'member.kick', 'member.ban', 'character.approve'];

/** The one community badge a set of roles earns: owner, then admin, then moderator. */
export function communityBadgeFor(held: ReadonlyArray<{ isOwner: boolean; permissions: readonly string[] }>): CommunityBadgeKey | null {
  if (held.some((role) => role.isOwner)) return 'owner';
  const keys = new Set(held.flatMap((role) => role.permissions));
  if (ADMIN_KEYS.some((key) => keys.has(key))) return 'admin';
  if (MODERATOR_KEYS.some((key) => keys.has(key))) return 'moderator';
  return null;
}

const requireStaff = (actor: Actor) => {
  if (actor.platformRole !== 'staff') throw new DomainError('forbidden', 'Only Rootwardens, the WorldRoot staff, can do that.');
};

async function requireUser(db: Db, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new DomainError('not_found', 'That account does not exist.');
  return user;
}

/** Gives or takes away one of the hand-granted badges. Staff only. */
export async function setBadge(db: Db, actor: Actor, userId: string, badge: string, granted: boolean): Promise<void> {
  requireStaff(actor);
  if (!isBadgeKey(badge) || !BADGES[badge].grantable) throw new DomainError('invalid_input', 'That badge cannot be granted by hand.');
  await requireUser(db, userId);

  await db.transaction(async (tx) => {
    const changed = granted
      ? await tx.insert(userBadges).values({ userId, badge, grantedByUserId: actor.userId }).onConflictDoNothing().returning({ badge: userBadges.badge })
      : await tx.delete(userBadges).where(and(eq(userBadges.userId, userId), eq(userBadges.badge, badge))).returning({ badge: userBadges.badge });
    if (changed.length === 0) return;
    await recordAudit(tx, {
      actor,
      action: granted ? 'platform.badge.grant' : 'platform.badge.revoke',
      targetType: 'user',
      targetId: userId,
      after: { badge },
    });
    if (granted) {
      await notify(tx, { userId, type: 'badge.granted', groupKey: `badge:${badge}`, subject: BADGES[badge].label, href: '/settings/profile' });
    }
  });
}

/**
 * Turns Heartwood on or off for an account. Staff only, and by hand for now:
 * there is no billing yet, so this is how a Heartwood account comes to exist.
 */
export async function setPremium(db: Db, actor: Actor, userId: string, premium: boolean): Promise<void> {
  requireStaff(actor);
  const user = await requireUser(db, userId);
  if (premium === Boolean(user.premiumSince)) return;
  await db.transaction(async (tx) => {
    await tx.update(users).set({ premiumSince: premium ? new Date() : null }).where(eq(users.id, userId));
    await recordAudit(tx, {
      actor,
      action: premium ? 'platform.premium.grant' : 'platform.premium.revoke',
      targetType: 'user',
      targetId: userId,
    });
    if (premium) {
      await notify(tx, { userId, type: 'badge.granted', groupKey: 'badge:premium', subject: BADGES.premium.label, href: '/settings/profile' });
    }
  });
}

export interface AccountRow {
  userId: string;
  email: string;
  handle: string | null;
  displayName: string | null;
  badges: BadgeKey[];
  createdAt: Date;
}

/** Finds accounts by handle, display name or email. Staff only. */
export async function searchAccounts(db: Db, actor: Actor, query: string): Promise<AccountRow[]> {
  requireStaff(actor);
  const term = `%${query.trim().replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      handle: profiles.handle,
      displayName: profiles.displayName,
      badges: platformBadgesSql,
      staff: users.platformRole,
      premiumSince: users.premiumSince,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(query.trim() ? or(ilike(users.email, term), ilike(profiles.handle, term), ilike(profiles.displayName, term)) : undefined)
    .orderBy(sql`${users.createdAt} desc`)
    .limit(50);

  return rows.map((row) => ({
    userId: row.userId,
    email: row.email,
    handle: row.handle,
    displayName: row.displayName,
    // Someone who has not finished onboarding has no profile row to hang the badge query on.
    badges: toBadges(row.badges ?? [row.staff === 'staff' ? 'staff' : null, row.premiumSince ? 'premium' : null]),
    createdAt: row.createdAt,
  }));
}
