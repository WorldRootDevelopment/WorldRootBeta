import { toBadges, type BadgeKey } from '@worldroot/contracts';
import { friendships, profiles, type Db } from '@worldroot/db';
import { and, asc, count, eq, or } from 'drizzle-orm';
import { ONLINE_WINDOW_SECONDS } from '../community/presence';
import { notify } from '../notifications/service';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { isBlockedBetween, shareCommunity } from './account';
import { checkAchievements } from './achievements';
import { platformBadgesSql } from './badges';
import { getProfileByHandle } from './profile';

/** How many requests one person may have waiting on other people at once. */
export const MAX_OUTGOING_REQUESTS = 50;

/** How two people stand: strangers, friends, or a request waiting on one of them. */
export type FriendState = 'none' | 'friends' | 'incoming' | 'outgoing';

const between = (a: string, b: string) =>
  or(
    and(eq(friendships.requesterUserId, a), eq(friendships.addresseeUserId, b)),
    and(eq(friendships.requesterUserId, b), eq(friendships.addresseeUserId, a)),
  );

/** How the actor stands with someone. `incoming` means that person has asked the actor. */
export async function friendState(db: Db, actorUserId: string, otherUserId: string): Promise<FriendState> {
  const [row] = await db.select().from(friendships).where(between(actorUserId, otherUserId));
  if (!row) return 'none';
  if (row.status === 'accepted') return 'friends';
  return row.requesterUserId === actorUserId ? 'outgoing' : 'incoming';
}

export const areFriends = async (db: Db, a: string, b: string) => (await friendState(db, a, b)) === 'friends';

/** True when two people may message each other without a request first: friends, or members of a community together. */
export async function knowEachOther(db: Db, a: string, b: string): Promise<boolean> {
  return (await areFriends(db, a, b)) || (await shareCommunity(db, a, b));
}

// One wording for "no such person" and "that person has blocked you", so a block is never revealed.
const unavailable = () => new DomainError('not_found', 'No one with that handle can be added.', { fields: { handle: 'No one with that handle can be added.' } });

async function accept(db: Db, actor: Actor, requesterUserId: string): Promise<void> {
  const updated = await db
    .update(friendships)
    .set({ status: 'accepted', acceptedAt: new Date() })
    .where(and(eq(friendships.requesterUserId, requesterUserId), eq(friendships.addresseeUserId, actor.userId), eq(friendships.status, 'pending')))
    .returning({ requester: friendships.requesterUserId });
  if (updated.length === 0) throw new DomainError('not_found', 'That request is no longer waiting.');
  await notify(db, {
    userId: requesterUserId,
    type: 'friend.accepted',
    groupKey: `friend:${actor.userId}:accepted`,
    subject: 'your friend request',
    href: '/inbox/friends',
    actorUserId: actor.userId,
  });
  await checkAchievements(db, actor.userId, 'friends');
  await checkAchievements(db, requesterUserId, 'friends');
}

/**
 * Asks someone to be friends, by handle. If they have already asked the
 * actor, this accepts instead. Returns how the two now stand.
 */
export async function sendFriendRequest(db: Db, actor: Actor, handle: unknown): Promise<FriendState> {
  const profile = typeof handle === 'string' && handle.trim() ? await getProfileByHandle(db, handle.trim().replace(/^@/, '')) : null;
  if (!profile) throw unavailable();
  if (profile.userId === actor.userId) {
    throw new DomainError('invalid_input', 'That is you.', { fields: { handle: 'That is you.' } });
  }
  if (await isBlockedBetween(db, actor.userId, profile.userId)) throw unavailable();

  const state = await friendState(db, actor.userId, profile.userId);
  if (state === 'friends' || state === 'outgoing') return state;
  if (state === 'incoming') {
    await accept(db, actor, profile.userId);
    return 'friends';
  }

  const [waiting] = await db
    .select({ value: count() })
    .from(friendships)
    .where(and(eq(friendships.requesterUserId, actor.userId), eq(friendships.status, 'pending')));
  if ((waiting?.value ?? 0) >= MAX_OUTGOING_REQUESTS) {
    throw new DomainError('conflict', `You have ${MAX_OUTGOING_REQUESTS} requests waiting. Cancel some before sending more.`);
  }
  await db.insert(friendships).values({ requesterUserId: actor.userId, addresseeUserId: profile.userId }).onConflictDoNothing();
  await notify(db, {
    userId: profile.userId,
    type: 'friend.request',
    groupKey: `friend:${actor.userId}:request`,
    subject: 'a friend request',
    href: '/inbox/friends',
    actorUserId: actor.userId,
  });
  return 'outgoing';
}

/** Accepts a request the named person sent to the actor. */
export async function acceptFriendRequest(db: Db, actor: Actor, requesterUserId: string): Promise<void> {
  await accept(db, actor, requesterUserId);
}

/**
 * Ends whatever stands between the actor and someone: declines their request,
 * cancels the actor's own, or stops being friends. The other person is not told.
 */
export async function removeFriend(db: Db, actor: Actor, otherUserId: string): Promise<void> {
  await db.delete(friendships).where(between(actor.userId, otherUserId));
}

export interface FriendRow {
  userId: string;
  handle: string;
  displayName: string;
  avatarId: string | null;
  status: string | null;
  badges: BadgeKey[];
  online: boolean;
}

export interface FriendLists {
  friends: FriendRow[];
  /** People who have asked the actor. */
  incoming: FriendRow[];
  /** People the actor has asked. */
  outgoing: FriendRow[];
}

/** The actor's friends, online first, and the requests waiting in each direction. */
export async function listFriends(db: Db, actor: Actor): Promise<FriendLists> {
  const rows = await db
    .select({ friendship: friendships, profile: profiles, badges: platformBadgesSql })
    .from(friendships)
    .innerJoin(
      profiles,
      or(
        and(eq(friendships.requesterUserId, actor.userId), eq(profiles.userId, friendships.addresseeUserId)),
        and(eq(friendships.addresseeUserId, actor.userId), eq(profiles.userId, friendships.requesterUserId)),
      ),
    )
    .orderBy(asc(profiles.displayName));

  const cutoff = Date.now() - ONLINE_WINDOW_SECONDS * 1000;
  const lists: FriendLists = { friends: [], incoming: [], outgoing: [] };
  for (const { friendship, profile, badges } of rows) {
    const friend = friendship.status === 'accepted';
    const row: FriendRow = {
      userId: profile.userId,
      handle: profile.handle,
      displayName: profile.displayName,
      avatarId: profile.avatarMediaId,
      status: profile.status,
      badges: toBadges(badges),
      // Only friends see each other's presence here, and never past "appear offline".
      online: friend && !profile.hideOnline && Boolean(profile.lastSeenAt && profile.lastSeenAt.getTime() >= cutoff),
    };
    if (friend) lists.friends.push(row);
    else if (friendship.requesterUserId === actor.userId) lists.outgoing.push(row);
    else lists.incoming.push(row);
  }
  lists.friends.sort((a, b) => Number(b.online) - Number(a.online));
  return lists;
}

export async function countIncomingFriendRequests(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(friendships)
    .where(and(eq(friendships.addresseeUserId, userId), eq(friendships.status, 'pending')));
  return row?.value ?? 0;
}
