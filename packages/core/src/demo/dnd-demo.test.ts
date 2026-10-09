import { characters, scenes as sceneTable, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCharacterToCommunity, createCharacter, listCommunityCharacters } from '../characters/service';
import { getCommunityView, joinCommunity, listCharacterFields, listMyCommunities } from '../community/service';
import { createProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { rollInScene } from '../scenes/rolls';
import { getSceneView, joinScene, listPosts } from '../scenes/service';
import { DEMO_ACCOUNT, DEMO_COMMUNITY_SLUG, grantDemoAccess, seedDemo } from './demo-town';
import { DND_DEMO_COMMUNITY_SLUG, seedDndDemo } from './dnd-demo';

let connection: DbConnection;

beforeAll(async () => {
  connection = await createTestDb();
});

afterAll(async () => {
  await connection.close();
});

describe('the DnD demo community', () => {
  it('is seeded once with dice on, a cast, and a scene that already shows rolls', async () => {
    const { db } = connection;
    await seedDemo(db);
    expect(await seedDndDemo(db)).toEqual({ created: true, communitySlug: DND_DEMO_COMMUNITY_SLUG });

    const [host] = await db.select().from(users).where(eq(users.email, DEMO_ACCOUNT.email));
    const hostActor: Actor = { userId: host!.id, platformRole: 'user' };
    const { community } = await getCommunityView(db, hostActor, DND_DEMO_COMMUNITY_SLUG);
    expect(community).toMatchObject({ name: 'Demo Dungeon', dndMode: true, listed: true });
    expect((await listCharacterFields(db, community.id)).map((field) => field.label)).toEqual(['Class', 'Level', 'Background']);
    expect((await listCommunityCharacters(db, community.id)).map((character) => character.name).sort()).toEqual(['Brannoch Hale', 'Dungeon Master']);

    const scenes = (await db.select().from(sceneTable).where(eq(sceneTable.communityId, community.id))).map((scene) => ({ scene }));
    const door = scenes.find((row) => row.scene.title === 'The Sealed Door')!;
    expect(scenes.map((row) => row.scene.title).sort()).toEqual(['The Sealed Door', 'Work for the Willing']);
    const story = await listPosts(db, hostActor, door.scene.id, { stream: 'story' });
    expect(story.posts.map((post) => post.kind)).toEqual(['ic', 'ic', 'system', 'ic', 'system', 'ic']);
    expect(story.posts.filter((post) => post.kind === 'system').map((post) => post.contentText)).toEqual([
      'Brannoch Hale rolled 1d20+5 to force the door (Strength): 14 + 5 = 19',
      'Dungeon Master rolled 2d6 for the falling stones: 3 + 4 = 7',
    ]);

    // Starting again changes nothing, and the next start does not sweep the demo cast away.
    await seedDemo(db);
    expect(await seedDndDemo(db)).toEqual({ created: false, communitySlug: DND_DEMO_COMMUNITY_SLUG });
    expect(await listCommunityCharacters(db, community.id)).toHaveLength(2);
    expect((await db.select().from(characters).where(eq(characters.playerUserId, host!.id))).map((row) => row.name).sort()).toEqual([
      'Brannoch Hale',
      'Brannoch Hale',
      'Dungeon Master',
      'Dungeon Master',
      'Narrator',
      'Narrator',
    ]);

    // A newcomer can join, bring a character with a class, and roll.
    const [user] = await db.insert(users).values({ name: 'thea', email: 'thea@example.com' }).returning();
    const thea: Actor = { userId: user!.id, platformRole: 'user' };
    await createProfile(db, thea, { handle: 'thea', displayName: 'Thea', adultConfirmed: true });
    await joinCommunity(db, thea, community.id);
    const fields = await listCharacterFields(db, community.id);
    const original = await createCharacter(db, thea, { name: 'Sable' });
    await expect(addCharacterToCommunity(db, thea, original.id, community.id)).rejects.toMatchObject({ code: 'invalid_input' });
    const sable = await addCharacterToCommunity(db, thea, original.id, community.id, { customValues: { [fields[0]!.id]: 'Rogue' } });
    await joinScene(db, thea, door.scene.id, [sable.id]);
    expect((await getSceneView(db, thea, door.scene.id)).dice).toBe(true);
    const { result } = await rollInScene(db, thea, door.scene.id, { notation: 'd20', characterId: sable.id, reason: 'to listen at the stair' });
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.total).toBeLessThanOrEqual(20);

    // The administrator can be made an owner of either demo.
    await grantDemoAccess(db, thea.userId, DND_DEMO_COMMUNITY_SLUG);
    expect((await getCommunityView(db, thea, DND_DEMO_COMMUNITY_SLUG)).isOwner).toBe(true);
    expect((await listMyCommunities(db, thea.userId)).map((row) => row.slug)).toEqual([DND_DEMO_COMMUNITY_SLUG]);
    expect((await getCommunityView(db, thea, DEMO_COMMUNITY_SLUG)).isOwner).toBe(false);
  });
});
