import { lfrpListings, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setCommunityArchived } from '../community/admin';
import { createCommunity, joinCommunity } from '../community/service';
import { blockUser } from '../identity/account';
import { createProfile } from '../identity/profile';
import { createReport, listReports } from '../moderation/reports';
import type { Actor } from '../platform/authorize';
import { createListing, discoverCommunities, listListings, removeListing } from './service';

let connection: DbConnection;

const addUser = async (handle: string, isStaff = false): Promise<Actor> => {
  const [user] = await connection.db
    .insert(users)
    .values({ name: handle, email: `${handle}@example.com`, platformRole: isStaff ? 'staff' : 'user' })
    .returning();
  const actor: Actor = { userId: user!.id, platformRole: isStaff ? 'staff' : 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

const listing = (title: string, genres: string[] = ['fantasy'], kind = 'one_on_one') => ({
  title,
  body: 'A slow-burn mystery in a harbour town, two leads.',
  genres,
  kind,
  pace: 'daily',
  rating: 'teen',
});

const titles = async (actor: Actor, filter = {}) => (await listListings(connection.db, actor, filter)).map((row) => row.listing.title);

beforeAll(async () => {
  connection = await createTestDb();
});

afterAll(async () => {
  await connection.close();
});

describe('discovering communities', () => {
  it('shows listed, live communities only, the largest first, and can be searched', async () => {
    const { db } = connection;
    const owner = await addUser('founder');
    const visitor = await addUser('visitor');
    const harbour = await createCommunity(db, owner, { slug: 'harbour', name: 'Harbour Lights', tagline: 'Noir by the sea', listed: true });
    await createCommunity(db, owner, { slug: 'orchard', name: 'Orchard', listed: true });
    await createCommunity(db, owner, { slug: 'hidden', name: 'Hidden Harbour', listed: false });
    // A free account owns at most three communities, so the fourth belongs to someone else.
    const other = await addUser('second_founder');
    const gone = await createCommunity(db, other, { slug: 'gone', name: 'Gone Harbour', listed: true });
    await setCommunityArchived(db, other, gone.id, true);
    await joinCommunity(db, visitor, harbour.id);

    const found = await discoverCommunities(db, visitor);
    expect(found.map((row) => [row.community.name, row.memberCount, row.isMember])).toEqual([
      ['Harbour Lights', 2, true],
      ['Orchard', 1, false],
    ]);
    // The unlisted one stays out even for its owner.
    expect((await discoverCommunities(db, owner)).map((row) => row.community.slug)).not.toContain('hidden');
    expect((await discoverCommunities(db, visitor, 'noir')).map((row) => row.community.name)).toEqual(['Harbour Lights']);
    expect(await discoverCommunities(db, visitor, '100%')).toEqual([]);
  });
});

describe('looking for RP', () => {
  it('lists open listings, filters them, hides them across a block, and lets them lapse', async () => {
    const { db } = connection;
    const thea = await addUser('thea');
    const marcus = await addUser('marcus');
    const sarah = await addUser('sarah');
    const staff = await addUser('staffer', true);

    await expect(createListing(db, thea, { ...listing('x'), genres: [] })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(createListing(db, thea, listing('Too many', ['fantasy', 'horror', 'mystery', 'romance']))).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(createListing(db, thea, listing('Made up', ['westerns']))).rejects.toMatchObject({ code: 'invalid_input' });

    const first = await createListing(db, thea, listing('Harbour mystery', ['mystery', 'historical']));
    await createListing(db, marcus, listing('Starship crew', ['scifi'], 'group'));
    expect(await titles(sarah)).toEqual(['Starship crew', 'Harbour mystery']);
    expect(await titles(sarah, { genre: 'mystery' })).toEqual(['Harbour mystery']);
    expect(await titles(sarah, { kind: 'group' })).toEqual(['Starship crew']);
    // A filter never hides your own listings from you.
    expect(await titles(thea, { genre: 'scifi' })).toEqual(['Starship crew', 'Harbour mystery']);
    expect((await listListings(db, thea)).map((row) => row.mine)).toEqual([false, true]);

    // Three open at a time.
    await createListing(db, thea, listing('Second'));
    await createListing(db, thea, listing('Third'));
    await expect(createListing(db, thea, listing('Fourth'))).rejects.toMatchObject({ code: 'conflict' });

    // A block hides listings in both directions.
    await blockUser(db, sarah, marcus.userId);
    expect(await titles(sarah)).not.toContain('Starship crew');
    await createListing(db, sarah, listing('Quiet village'));
    expect(await titles(marcus)).not.toContain('Quiet village');

    // A lapsed listing leaves the board, stays visible to its author, and frees a slot.
    await db.update(lfrpListings).set({ expiresAt: new Date(Date.now() - 1_000) }).where(eq(lfrpListings.id, first.id));
    expect(await titles(sarah)).not.toContain('Harbour mystery');
    expect((await listListings(db, thea)).find((row) => row.listing.id === first.id)).toMatchObject({ mine: true, expired: true });
    await createListing(db, thea, listing('Fourth'));

    // Only the author or staff can take one down. A report reaches staff, not a community.
    const [mine] = (await listListings(db, marcus)).filter((row) => row.mine);
    await expect(removeListing(db, thea, mine!.listing.id)).rejects.toMatchObject({ code: 'not_found' });
    await createReport(db, thea, { targetType: 'lfrp', targetId: mine!.listing.id, category: 'spam' });
    const [report] = await listReports(db, staff, 'platform');
    expect(report).toMatchObject({ escalated: true, communityName: null, subjectHandle: 'marcus', targetType: 'lfrp' });
    expect(report!.snapshot.text).toContain('Starship crew');
    await removeListing(db, staff, mine!.listing.id);
    expect(await titles(thea)).not.toContain('Starship crew');
  });
});
