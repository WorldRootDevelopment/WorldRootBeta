import { FREE_LIMITS, PREMIUM, PREMIUM_LIMITS } from '@worldroot/contracts';
import { characters, communities, roleAssignments, roles, users, type Db } from '@worldroot/db';
import { and, count, eq, isNull } from 'drizzle-orm';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';

/**
 * Whether an account has what Premium gives. WorldRoot staff always do. There
 * is no billing yet, so an account is Premium only when staff have made it so.
 */
export async function hasPremium(db: Db, actor: Actor): Promise<boolean> {
  if (actor.platformRole === 'staff') return true;
  const [user] = await db.select({ premiumSince: users.premiumSince }).from(users).where(eq(users.id, actor.userId));
  return Boolean(user?.premiumSince);
}

/**
 * How many pictures a character's gallery may hold. It goes by the plan of the person who plays the
 * character, whoever is doing the uploading, so a moderator tidying a profile neither gains nor loses room.
 */
export async function characterImageLimit(db: Db, playerUserId: string | null): Promise<number> {
  if (!playerUserId) return FREE_LIMITS.characterImages;
  const [player] = await db.select({ premiumSince: users.premiumSince, platformRole: users.platformRole }).from(users).where(eq(users.id, playerUserId));
  return player?.premiumSince || player?.platformRole === 'staff' ? PREMIUM_LIMITS.characterImages : FREE_LIMITS.characterImages;
}

/**
 * The demo host and the shared guest account. One is filled by WorldRoot itself and the other is used
 * by everyone trying the site, so a limit meant for one person's library would fill at once. They get
 * room to make things and nothing else Premium gives. Kept as plain addresses here because the demo
 * code builds on the services this file guards; a test holds the two in step.
 */
export const UNLIMITED_DEMO_EMAILS = ['host@worldroot.test', 'guest@worldroot.test'];

async function unlimited(db: Db, actor: Actor): Promise<boolean> {
  if (actor.platformRole === 'staff') return true;
  const [user] = await db.select({ premiumSince: users.premiumSince, email: users.email }).from(users).where(eq(users.id, actor.userId));
  return Boolean(user?.premiumSince) || UNLIMITED_DEMO_EMAILS.includes(user?.email ?? '');
}

export interface PlanUsage {
  premium: boolean;
  /** How many the person has, and how many a free account may have. `limit` is null when there is none. */
  characters: { used: number; limit: number | null };
  communities: { used: number; limit: number | null };
}

async function countCharacters(db: Db, userId: string): Promise<number> {
  // Originals in their own library. A community's copy of one is the same character, so it is not counted again.
  const [row] = await db
    .select({ value: count() })
    .from(characters)
    .where(and(eq(characters.playerUserId, userId), isNull(characters.communityId)));
  return row?.value ?? 0;
}

async function countOwnedCommunities(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(roleAssignments)
    .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
    .innerJoin(communities, eq(communities.id, roleAssignments.communityId))
    .where(and(eq(roleAssignments.userId, userId), eq(roles.isOwner, true), isNull(communities.archivedAt)));
  return row?.value ?? 0;
}

/** What the actor has against what their account allows, for showing them where they stand. */
export async function getPlanUsage(db: Db, actor: Actor): Promise<PlanUsage> {
  const [premium, usedCharacters, usedCommunities] = await Promise.all([hasPremium(db, actor), countCharacters(db, actor.userId), countOwnedCommunities(db, actor.userId)]);
  return {
    premium,
    characters: { used: usedCharacters, limit: premium ? null : FREE_LIMITS.characters },
    communities: { used: usedCommunities, limit: premium ? null : FREE_LIMITS.communities },
  };
}

const full = (message: string) => new DomainError('forbidden', `${message} ${PREMIUM.name}, which is coming soon, removes the limit.`);

/** Refuses a new character when a free account already has as many as it may. */
export async function assertRoomForCharacter(db: Db, actor: Actor): Promise<void> {
  if (await unlimited(db, actor)) return;
  if ((await countCharacters(db, actor.userId)) >= FREE_LIMITS.characters) {
    throw full(`A free account can keep ${FREE_LIMITS.characters} characters in its library, and you have ${FREE_LIMITS.characters}.`);
  }
}

/** Refuses a new community when a free account already owns as many as it may. */
export async function assertRoomForCommunity(db: Db, actor: Actor): Promise<void> {
  if (await unlimited(db, actor)) return;
  if ((await countOwnedCommunities(db, actor.userId)) >= FREE_LIMITS.communities) {
    throw full(`A free account can own ${FREE_LIMITS.communities} communities during the beta, and you own ${FREE_LIMITS.communities}.`);
  }
}
