import { communities, locations, users, worlds, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { docFromText } from '@worldroot/editor';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCharacterToCommunity, createCharacter } from '../characters/service';
import { updateCommunity } from '../community/admin';
import { joinCommunity, listCharacterFields } from '../community/service';
import { DEMO_ACCOUNT, DEMO_COMMUNITY_SLUG, seedDemo } from '../demo/demo-town';
import { createProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { createScene, getSceneSetup } from './service';

let connection: DbConnection;

beforeAll(async () => {
  connection = await createTestDb();
  await seedDemo(connection.db);
});

afterAll(async () => {
  await connection.close();
});

describe('a community’s highest scene rating', () => {
  it('stops new scenes being rated above it, and leaves private scenes alone', async () => {
    const { db } = connection;
    const [host] = await db.select().from(users).where(eq(users.email, DEMO_ACCOUNT.email));
    const owner: Actor = { userId: host!.id, platformRole: 'user' };
    const [town] = await db.select().from(communities).where(eq(communities.slug, DEMO_COMMUNITY_SLUG));
    const [spot] = await db.select({ id: locations.id }).from(locations).innerJoin(worlds, eq(worlds.id, locations.worldId)).where(eq(worlds.ownerCommunityId, town!.id));

    const [user] = await db.insert(users).values({ name: 'thea', email: 'thea@example.com' }).returning();
    const thea: Actor = { userId: user!.id, platformRole: 'user' };
    await createProfile(db, thea, { handle: 'thea', displayName: 'Thea', adultConfirmed: true });
    await joinCommunity(db, thea, town!.id);
    const original = await createCharacter(db, thea, { name: 'Captain Thea' });
    const fields = await listCharacterFields(db, town!.id);
    const customValues = Object.fromEntries(fields.filter((field) => field.required).map((field) => [field.id, field.options?.[0] ?? 'Visitor']));
    const captain = await addCharacterToCommunity(db, thea, original.id, town!.id, { customValues });

    const scene = (rating: 'everyone' | 'teen' | 'mature' | 'adult', locationId: string | null) =>
      createScene(db, thea, { title: `A ${rating} scene`, rating, locationId, characterIds: [locationId ? captain.id : original.id], openingPost: docFromText('It began.') });

    // By default every rating is allowed.
    expect(town!.maxRating).toBe('adult');
    const early = await scene('mature', spot!.id);

    const settings = { name: town!.name, tagline: town!.tagline, description: town!.description, rules: town!.rules, accentHue: town!.accentHue, listed: town!.listed, requireCharacterApproval: town!.requireCharacterApproval };
    await expect(updateCommunity(db, owner, town!.id, { ...settings, maxRating: 'explicit' as 'teen' })).rejects.toMatchObject({ code: 'invalid_input' });
    await updateCommunity(db, owner, town!.id, { ...settings, maxRating: 'teen' });
    expect((await getSceneSetup(db, thea, spot!.id)).place?.maxRating).toBe('teen');

    await scene('everyone', spot!.id);
    await scene('teen', spot!.id);
    const refused = { code: 'invalid_input', fields: { rating: 'Scenes in this community can be rated up to Teen.' } };
    await expect(scene('mature', spot!.id)).rejects.toMatchObject(refused);
    await expect(scene('adult', spot!.id)).rejects.toMatchObject(refused);

    // The scene made before the change keeps its rating, and a private scene is the writers' own business.
    expect(early.rating).toBe('mature');
    expect((await scene('adult', null)).rating).toBe('adult');

    // A save that does not mention it leaves the limit where it was.
    expect((await updateCommunity(db, owner, town!.id, settings)).maxRating).toBe('teen');
  });
});
