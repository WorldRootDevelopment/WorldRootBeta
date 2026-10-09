import { ACHIEVEMENT_KEYS, ACHIEVEMENTS, type AchievementKey } from '@worldroot/contracts';
import { characters, communityMembers, friendships, lfrpListings, locations, profiles, roleAssignments, roles, scenePosts, scenes, userBadges, worlds, type Db } from '@worldroot/db';
import { and, count, eq, isNotNull, isNull, or } from 'drizzle-orm';
import { notify } from '../notifications/service';

/** What a person just did. Only the achievements that action could earn are checked. */
export type AchievementTopic = 'posts' | 'scenes' | 'characters' | 'worlds' | 'communities' | 'friends' | 'rolls' | 'profile' | 'listings';

const total = async (query: Promise<Array<{ value: number }>>) => (await query)[0]?.value ?? 0;

/** Locations in each of the worlds a person keeps in their own library. */
const ownLocations = (db: Db, userId: string) =>
  db
    .select({ worldId: locations.worldId, value: count() })
    .from(locations)
    .innerJoin(worlds, eq(worlds.id, locations.worldId))
    .where(eq(worlds.ownerUserId, userId))
    .groupBy(locations.worldId);

/** The things achievements count. Several achievements may count the same thing to different targets. */
const METRICS = {
  icPosts: (db: Db, userId: string) =>
    total(db.select({ value: count() }).from(scenePosts).where(and(eq(scenePosts.authorUserId, userId), eq(scenePosts.kind, 'ic'), isNull(scenePosts.removedAt)))),
  scenesStarted: (db: Db, userId: string) => total(db.select({ value: count() }).from(scenes).where(eq(scenes.createdByUserId, userId))),
  scenesCompleted: (db: Db, userId: string) =>
    total(db.select({ value: count() }).from(scenes).where(and(eq(scenes.createdByUserId, userId), eq(scenes.status, 'completed')))),
  // Library originals only: adding one character to ten communities is not ten characters.
  ownCharacters: (db: Db, userId: string) =>
    total(db.select({ value: count() }).from(characters).where(and(eq(characters.playerUserId, userId), isNull(characters.communityId)))),
  ownWorlds: (db: Db, userId: string) => total(db.select({ value: count() }).from(worlds).where(eq(worlds.ownerUserId, userId))),
  largestWorld: async (db: Db, userId: string) => Math.max(0, ...(await ownLocations(db, userId)).map((world) => world.value)),
  allLocations: async (db: Db, userId: string) => (await ownLocations(db, userId)).reduce((sum, world) => sum + world.value, 0),
  communitiesOwned: (db: Db, userId: string) =>
    total(
      db
        .select({ value: count() })
        .from(roleAssignments)
        .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
        .where(and(eq(roleAssignments.userId, userId), eq(roles.isOwner, true))),
    ),
  communitiesJoined: (db: Db, userId: string) => total(db.select({ value: count() }).from(communityMembers).where(eq(communityMembers.userId, userId))),
  listings: (db: Db, userId: string) => total(db.select({ value: count() }).from(lfrpListings).where(eq(lfrpListings.userId, userId))),
  hasPicture: (db: Db, userId: string) =>
    total(db.select({ value: count() }).from(profiles).where(and(eq(profiles.userId, userId), isNotNull(profiles.avatarMediaId)))),
  friends: (db: Db, userId: string) =>
    total(
      db
        .select({ value: count() })
        .from(friendships)
        .where(and(eq(friendships.status, 'accepted'), or(eq(friendships.requesterUserId, userId), eq(friendships.addresseeUserId, userId)))),
    ),
  rolls: (db: Db, userId: string) =>
    total(db.select({ value: count() }).from(scenePosts).where(and(eq(scenePosts.authorUserId, userId), eq(scenePosts.kind, 'system')))),
} as const;

type Metric = keyof typeof METRICS;

/**
 * How each achievement is earned: after which kind of action it is checked,
 * and what it counts. The two with no metric are granted at the moment they
 * happen (a particular number on a die), so there is nothing to count.
 */
const RULES: Record<AchievementKey, { topic: AchievementTopic; metric: Metric | null }> = {
  first_words: { topic: 'posts', metric: 'icPosts' },
  storyteller: { topic: 'posts', metric: 'icPosts' },
  wordsmith: { topic: 'posts', metric: 'icPosts' },
  scene_setter: { topic: 'scenes', metric: 'scenesStarted' },
  the_end: { topic: 'scenes', metric: 'scenesCompleted' },
  new_face: { topic: 'characters', metric: 'ownCharacters' },
  ensemble_cast: { topic: 'characters', metric: 'ownCharacters' },
  world_seed: { topic: 'worlds', metric: 'ownWorlds' },
  worldbuilder: { topic: 'worlds', metric: 'largestWorld' },
  cartographer: { topic: 'worlds', metric: 'allLocations' },
  host: { topic: 'communities', metric: 'communitiesOwned' },
  regular: { topic: 'communities', metric: 'communitiesJoined' },
  open_call: { topic: 'listings', metric: 'listings' },
  face_to_the_name: { topic: 'profile', metric: 'hasPicture' },
  kindred_spirit: { topic: 'friends', metric: 'friends' },
  good_company: { topic: 'friends', metric: 'friends' },
  dice_goblin: { topic: 'rolls', metric: 'rolls' },
  natural_20: { topic: 'rolls', metric: null },
  critical_fumble: { topic: 'rolls', metric: null },
};

/** Reads each metric at most once, however many achievements count it. */
function counter(db: Db, userId: string) {
  const seen = new Map<Metric, Promise<number>>();
  return (metric: Metric) => {
    if (!seen.has(metric)) seen.set(metric, METRICS[metric](db, userId));
    return seen.get(metric)!;
  };
}

/** Gives someone an achievement they have not had before, and tells them. Returns whether it was new. */
export async function grantAchievement(db: Db, userId: string, key: AchievementKey): Promise<boolean> {
  const added = await db.insert(userBadges).values({ userId, badge: key }).onConflictDoNothing().returning({ badge: userBadges.badge });
  if (added.length === 0) return false;
  await notify(db, { userId, type: 'badge.granted', groupKey: `badge:${key}`, subject: ACHIEVEMENTS[key].label, href: '/settings/achievements' });
  return true;
}

/**
 * Checks the achievements one kind of action can earn, and grants any newly
 * earned. Call it after the action has been saved. It never fails the action:
 * a problem here is logged and the person simply earns the badge next time.
 */
export async function checkAchievements(db: Db, userId: string, topic: AchievementTopic): Promise<void> {
  try {
    const held = new Set((await db.select({ badge: userBadges.badge }).from(userBadges).where(eq(userBadges.userId, userId))).map((row) => row.badge));
    const read = counter(db, userId);
    for (const key of ACHIEVEMENT_KEYS) {
      const rule = RULES[key];
      if (rule.topic !== topic || !rule.metric || held.has(key)) continue;
      if ((await read(rule.metric)) >= ACHIEVEMENTS[key].target) await grantAchievement(db, userId, key);
    }
  } catch (error) {
    console.error('[worldroot] Could not check achievements.', error);
  }
}

export interface EarnedAchievement {
  key: AchievementKey;
  earnedAt: Date;
}

async function earnedBy(db: Db, userId: string): Promise<Map<string, Date>> {
  const rows = await db.select({ badge: userBadges.badge, earnedAt: userBadges.createdAt }).from(userBadges).where(eq(userBadges.userId, userId));
  return new Map(rows.map((row) => [row.badge, row.earnedAt]));
}

/** The achievements a person has earned, in registry order. This is what a profile shows. */
export async function listAchievements(db: Db, userId: string): Promise<EarnedAchievement[]> {
  const earned = await earnedBy(db, userId);
  return ACHIEVEMENT_KEYS.flatMap((key) => (earned.has(key) ? [{ key, earnedAt: earned.get(key)! }] : []));
}

export interface AchievementProgress {
  key: AchievementKey;
  earnedAt: Date | null;
  /** How far along, never more than the target. */
  current: number;
  target: number;
}

/** Every achievement with how far the person has got. For their own Achievements page. */
export async function listAchievementProgress(db: Db, userId: string): Promise<AchievementProgress[]> {
  const earned = await earnedBy(db, userId);
  const read = counter(db, userId);
  return Promise.all(
    ACHIEVEMENT_KEYS.map(async (key) => {
      const { target } = ACHIEVEMENTS[key];
      const earnedAt = earned.get(key) ?? null;
      const metric = RULES[key].metric;
      // An earned achievement reads as complete even if what it counted has since gone down.
      const current = earnedAt ? target : metric ? Math.min(target, await read(metric)) : 0;
      return { key, earnedAt, current, target };
    }),
  );
}
