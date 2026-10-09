import { isLfrpGenre, LFRP_DAYS, lfrpInputSchema, MAX_OPEN_LFRP, toBadges, type BadgeKey } from '@worldroot/contracts';
import { communities, communityMembers, lfrpListings, profiles, userBlocks, type Db } from '@worldroot/db';
import { and, asc, count, desc, eq, gt, ilike, isNull, or, sql } from 'drizzle-orm';
import type { Community } from '../community/service';
import { platformBadgesSql } from '../identity/badges';
import { recordAudit } from '../platform/audit';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { parseInput } from '../platform/validate';

export type LfrpListing = typeof lfrpListings.$inferSelect;

export interface DiscoveredCommunity {
  community: Community;
  memberCount: number;
  isMember: boolean;
}

const like = (query: string) => `%${query.trim().replace(/[%_\\]/g, (char) => `\\${char}`)}%`;

/**
 * Communities anyone may find: listed and not archived, the largest first.
 * Unlisted communities never appear here, whoever is looking, even to members.
 */
export async function discoverCommunities(db: Db, actor: Actor, query = ''): Promise<DiscoveredCommunity[]> {
  const members = sql<number>`(select count(*)::int from community_members m where m.community_id = ${communities.id})`;
  const rows = await db
    .select({ community: communities, memberCount: members, joined: communityMembers.userId })
    .from(communities)
    .leftJoin(communityMembers, and(eq(communityMembers.communityId, communities.id), eq(communityMembers.userId, actor.userId)))
    .where(
      and(
        eq(communities.listed, true),
        isNull(communities.archivedAt),
        query.trim() ? or(ilike(communities.name, like(query)), ilike(communities.tagline, like(query))) : undefined,
      ),
    )
    .orderBy(desc(members), asc(communities.name))
    .limit(60);
  return rows.map((row) => ({ community: row.community, memberCount: row.memberCount, isMember: Boolean(row.joined) }));
}

const notExpired = () => gt(lfrpListings.expiresAt, new Date());

/** Posts a "Looking for RP" listing. It lapses after 30 days. */
export async function createListing(db: Db, actor: Actor, input: unknown): Promise<LfrpListing> {
  const data = parseInput(lfrpInputSchema, input);
  const [open] = await db
    .select({ value: count() })
    .from(lfrpListings)
    .where(and(eq(lfrpListings.userId, actor.userId), notExpired()));
  if ((open?.value ?? 0) >= MAX_OPEN_LFRP) {
    throw new DomainError('conflict', `You can have ${MAX_OPEN_LFRP} listings open at once. Remove one to post another.`);
  }
  const [listing] = await db
    .insert(lfrpListings)
    .values({ ...data, genres: [...new Set(data.genres)], userId: actor.userId, expiresAt: new Date(Date.now() + LFRP_DAYS * 86_400_000) })
    .returning();
  return listing!;
}

export interface ListingRow {
  listing: LfrpListing;
  author: { userId: string; handle: string; displayName: string; badges: BadgeKey[] };
  mine: boolean;
  expired: boolean;
}

export interface ListingFilter {
  genre?: string | null;
  kind?: string | null;
}

/**
 * The board: open listings, newest first, and all of the actor's own. Nobody
 * sees a listing from someone on either side of a block.
 */
export async function listListings(db: Db, actor: Actor, filter: ListingFilter = {}): Promise<ListingRow[]> {
  const blocked = sql`exists (select 1 from ${userBlocks} where
    (${userBlocks.blockerUserId} = ${actor.userId} and ${userBlocks.blockedUserId} = ${lfrpListings.userId}) or
    (${userBlocks.blockerUserId} = ${lfrpListings.userId} and ${userBlocks.blockedUserId} = ${actor.userId}))`;
  const genre = isLfrpGenre(filter.genre) ? filter.genre : null;
  const rows = await db
    .select({ listing: lfrpListings, handle: profiles.handle, displayName: profiles.displayName, badges: platformBadgesSql })
    .from(lfrpListings)
    .innerJoin(profiles, eq(profiles.userId, lfrpListings.userId))
    .where(
      or(
        eq(lfrpListings.userId, actor.userId),
        and(
          notExpired(),
          sql`not ${blocked}`,
          genre ? sql`${lfrpListings.genres} @> ${JSON.stringify([genre])}::jsonb` : undefined,
          filter.kind === 'one_on_one' || filter.kind === 'group' ? eq(lfrpListings.kind, filter.kind) : undefined,
        ),
      ),
    )
    .orderBy(desc(lfrpListings.createdAt), desc(lfrpListings.id))
    .limit(100);
  const now = Date.now();
  return rows.map((row) => ({
    listing: row.listing,
    author: { userId: row.listing.userId, handle: row.handle, displayName: row.displayName, badges: toBadges(row.badges ?? []) },
    mine: row.listing.userId === actor.userId,
    expired: row.listing.expiresAt.getTime() <= now,
  }));
}

/** Takes a listing down. Its author can, and so can WorldRoot staff, whose removal is recorded. */
export async function removeListing(db: Db, actor: Actor, listingId: string): Promise<void> {
  const [listing] = await db.select().from(lfrpListings).where(eq(lfrpListings.id, listingId));
  if (!listing) throw new DomainError('not_found', 'That listing does not exist.');
  const mine = listing.userId === actor.userId;
  if (!mine && actor.platformRole !== 'staff') throw new DomainError('not_found', 'That listing does not exist.');
  await db.transaction(async (tx) => {
    await tx.delete(lfrpListings).where(eq(lfrpListings.id, listingId));
    if (!mine) {
      await recordAudit(tx, {
        actor,
        action: 'platform.lfrp.remove',
        targetType: 'lfrp_listing',
        targetId: listingId,
        before: { userId: listing.userId, title: listing.title, body: listing.body },
      });
    }
  });
}
