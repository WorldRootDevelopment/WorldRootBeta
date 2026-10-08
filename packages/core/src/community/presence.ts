import type { BadgeKey, CommunityBadgeKey } from '@worldroot/contracts';
import { communityMembers, profiles, type Db } from '@worldroot/db';
import { and, eq, sql } from 'drizzle-orm';
import type { Actor } from '../platform/authorize';
import { listMembers } from './admin';

/** Someone counts as online if they had WorldRoot open within this window. Browsers check in once a minute. */
export const ONLINE_WINDOW_SECONDS = 150;

/** Check-ins closer together than this are not written, to spare the database. */
const MIN_WRITE_GAP_SECONDS = 30;

/** Records that the actor has WorldRoot open right now. */
export async function touchPresence(db: Db, actor: Actor): Promise<void> {
  await db
    .update(profiles)
    .set({ lastSeenAt: new Date() })
    .where(
      and(
        eq(profiles.userId, actor.userId),
        sql`(${profiles.lastSeenAt} is null or ${profiles.lastSeenAt} < now() - make_interval(secs => ${MIN_WRITE_GAP_SECONDS}))`,
      ),
    );
}

export interface PresenceRow {
  userId: string;
  displayName: string;
  handle: string;
  badges: BadgeKey[];
  communityBadge: CommunityBadgeKey | null;
  online: boolean;
  /** The member's highest role, when it is something more than the built-in Member role. */
  role: string | null;
}

/** A community's members with who is online now: online first, then by rank, then by name. */
export async function listMemberPresence(db: Db, communityId: string): Promise<PresenceRow[]> {
  const members = await listMembers(db, communityId);
  const seen = await db
    .select({ userId: profiles.userId, lastSeenAt: profiles.lastSeenAt, hideOnline: profiles.hideOnline })
    .from(communityMembers)
    .innerJoin(profiles, eq(profiles.userId, communityMembers.userId))
    .where(eq(communityMembers.communityId, communityId));
  const cutoff = Date.now() - ONLINE_WINDOW_SECONDS * 1000;
  // Someone who has chosen to appear offline is never listed as online, whatever their last check-in.
  const online = new Set(
    seen.filter((row) => !row.hideOnline && row.lastSeenAt && row.lastSeenAt.getTime() >= cutoff).map((row) => row.userId),
  );

  return members
    .map((member, rank) => ({
      userId: member.userId,
      displayName: member.displayName,
      handle: member.handle,
      badges: member.badges,
      communityBadge: member.communityBadge,
      online: online.has(member.userId),
      role: member.roles.find((role) => !role.isDefault)?.name ?? null,
      rank,
    }))
    .sort((a, b) => Number(b.online) - Number(a.online) || a.rank - b.rank || a.displayName.localeCompare(b.displayName))
    .map(({ rank: _rank, ...row }) => row);
}
