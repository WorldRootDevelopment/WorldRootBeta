import { ACHIEVEMENT_KEYS, ACHIEVEMENTS, isAchievementKey, type AchievementKey } from '@worldroot/contracts';
import { characters, friendships, locations, roleAssignments, roles, scenePosts, userBadges, worlds, type Db } from '@worldroot/db';
import { and, count, eq, isNull, or, sql } from 'drizzle-orm';
import { notify } from '../notifications/service';

/** What a person just did. Only the achievements that action could earn are checked. */
export type AchievementTopic = 'posts' | 'characters' | 'worlds' | 'communities' | 'friends' | 'rolls';

const total = async (query: Promise<Array<{ value: number }>>) => (await query)[0]?.value ?? 0;

const icPosts = (db: Db, userId: string) =>
  total(db.select({ value: count() }).from(scenePosts).where(and(eq(scenePosts.authorUserId, userId), eq(scenePosts.kind, 'ic'), isNull(scenePosts.removedAt))));

/** Locations in the worlds a person keeps in their own library. */
const ownLocations = (db: Db, userId: string) =>
  db
    .select({ worldId: locations.worldId, value: count() })
    .from(locations)
    .innerJoin(worlds, eq(worlds.id, locations.worldId))
    .where(eq(worlds.ownerUserId, userId))
    .groupBy(locations.worldId);

const RULES: Record<AchievementTopic, Partial<Record<AchievementKey, (db: Db, userId: string) => Promise<boolean>>>> = {
  posts: {
    first_words: async (db, userId) => (await icPosts(db, userId)) >= 1,
    wordsmith: async (db, userId) => (await icPosts(db, userId)) >= 100,
  },
  characters: {
    // Library originals only: adding one character to ten communities is not ten characters.
    ensemble_cast: async (db, userId) =>
      (await total(db.select({ value: count() }).from(characters).where(and(eq(characters.playerUserId, userId), isNull(characters.communityId))))) >= 10,
  },
  worlds: {
    worldbuilder: async (db, userId) => (await ownLocations(db, userId)).some((world) => world.value >= 5),
    cartographer: async (db, userId) => (await ownLocations(db, userId)).reduce((sum, world) => sum + world.value, 0) >= 25,
  },
  communities: {
    host: async (db, userId) =>
      (await total(
        db
          .select({ value: count() })
          .from(roleAssignments)
          .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
          .where(and(eq(roleAssignments.userId, userId), eq(roles.isOwner, true))),
      )) >= 1,
  },
  friends: {
    good_company: async (db, userId) =>
      (await total(
        db
          .select({ value: count() })
          .from(friendships)
          .where(and(eq(friendships.status, 'accepted'), or(eq(friendships.requesterUserId, userId), eq(friendships.addresseeUserId, userId)))),
      )) >= 5,
  },
  rolls: {
    dice_goblin: async (db, userId) =>
      (await total(db.select({ value: count() }).from(scenePosts).where(and(eq(scenePosts.authorUserId, userId), eq(scenePosts.kind, 'system'))))) >= 25,
  },
};

/** Gives someone an achievement they have not had before, and tells them. Returns whether it was new. */
export async function grantAchievement(db: Db, userId: string, key: AchievementKey): Promise<boolean> {
  const added = await db.insert(userBadges).values({ userId, badge: key }).onConflictDoNothing().returning({ badge: userBadges.badge });
  if (added.length === 0) return false;
  await notify(db, { userId, type: 'badge.granted', groupKey: `badge:${key}`, subject: ACHIEVEMENTS[key].label, href: '/settings/profile' });
  return true;
}

/**
 * Checks the achievements one kind of action can earn, and grants any newly
 * earned. Call it after the action has been saved. It never fails the action:
 * a problem here is logged and the person simply earns the badge next time.
 */
export async function checkAchievements(db: Db, userId: string, topic: AchievementTopic): Promise<void> {
  try {
    const held = new Set(
      (await db.select({ badge: userBadges.badge }).from(userBadges).where(eq(userBadges.userId, userId))).map((row) => row.badge),
    );
    for (const [key, earned] of Object.entries(RULES[topic]) as Array<[AchievementKey, (db: Db, userId: string) => Promise<boolean>]>) {
      if (!held.has(key) && (await earned(db, userId))) await grantAchievement(db, userId, key);
    }
  } catch (error) {
    console.error('[worldroot] Could not check achievements.', error);
  }
}

export interface EarnedAchievement {
  key: AchievementKey;
  earnedAt: Date;
}

/** A person's achievements, in registry order. */
export async function listAchievements(db: Db, userId: string): Promise<EarnedAchievement[]> {
  const rows = await db
    .select({ badge: userBadges.badge, earnedAt: userBadges.createdAt })
    .from(userBadges)
    .where(and(eq(userBadges.userId, userId), sql`${userBadges.badge} = any(${sql.raw(`array[${ACHIEVEMENT_KEYS.map((key) => `'${key}'`).join(',')}]`)})`));
  return ACHIEVEMENT_KEYS.flatMap((key) => {
    const row = rows.find((earned) => earned.badge === key);
    return row && isAchievementKey(row.badge) ? [{ key, earnedAt: row.earnedAt }] : [];
  });
}
