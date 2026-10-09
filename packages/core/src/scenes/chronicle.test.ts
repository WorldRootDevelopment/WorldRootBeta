import { communities, locations, scenes, users, worlds, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { docFromText } from '@worldroot/editor';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCharacterToCommunity, createCharacter } from '../characters/service';
import { listMemberPresence } from '../community/presence';
import { joinCommunity, listCharacterFields } from '../community/service';
import { DEMO_COMMUNITY_SLUG, seedDemo } from '../demo/demo-town';
import { DND_DEMO_COMMUNITY_SLUG, seedDndDemo } from '../demo/dnd-demo';
import { createProfile } from '../identity/profile';
import { getProfileView, updateProfile } from '../identity/profile-view';
import type { Actor } from '../platform/authorize';
import { getChapter, listChapters } from './chronicle';
import { createPost, createScene, setSceneStatus } from './service';

let connection: DbConnection;
let thea: Actor;

beforeAll(async () => {
  connection = await createTestDb();
  await seedDemo(connection.db);
  await seedDndDemo(connection.db);
  const [user] = await connection.db.insert(users).values({ name: 'thea', email: 'thea@example.com' }).returning();
  thea = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, thea, { handle: 'thea', displayName: 'Thea', adultConfirmed: true });
});

afterAll(async () => {
  await connection.close();
});

describe('the chronicle', () => {
  it('is switched on in both demo communities and nowhere else by default', async () => {
    const { db } = connection;
    const rows = await db.select({ slug: communities.slug, chronicle: communities.chronicle }).from(communities);
    expect(rows.filter((row) => row.chronicle).map((row) => row.slug).sort()).toEqual([DND_DEMO_COMMUNITY_SLUG, DEMO_COMMUNITY_SLUG].sort());
  });

  it('turns finished scenes into chapters, numbered in the order they were finished', async () => {
    const { db } = connection;
    const [town] = await db.select().from(communities).where(eq(communities.slug, DEMO_COMMUNITY_SLUG));
    const [spot] = await db.select({ id: locations.id }).from(locations).innerJoin(worlds, eq(worlds.id, locations.worldId)).where(eq(worlds.ownerCommunityId, town!.id));

    // The demo comes with one finished scene: chapter one.
    const before = await listChapters(db, town!.id);
    expect(before).toHaveLength(1);
    expect(before[0]).toMatchObject({ number: 1 });
    const first = await getChapter(db, thea, before[0]!.sceneId);
    expect(first).toMatchObject({ number: 1, of: 1, previous: null, next: null, community: { slug: DEMO_COMMUNITY_SLUG } });
    expect(first.posts.length).toBeGreaterThan(0);

    // A new scene is not a chapter until it is finished.
    await joinCommunity(db, thea, town!.id);
    const original = await createCharacter(db, thea, { name: 'Captain Thea' });
    const fields = await listCharacterFields(db, town!.id);
    const customValues = Object.fromEntries(fields.filter((field) => field.required).map((field) => [field.id, field.options?.[0] ?? 'Visitor']));
    const captain = await addCharacterToCommunity(db, thea, original.id, town!.id, { customValues });
    const scene = await createScene(db, thea, { title: 'The Late Train', rating: 'teen', locationId: spot!.id, characterIds: [captain.id], openingPost: docFromText('The 11:40 was late again.') });
    await createPost(db, thea, scene.id, { kind: 'ooc', content: docFromText('brb, tea') });
    await createPost(db, thea, scene.id, { kind: 'ic', characterId: captain.id, content: docFromText('She checked her watch.') });
    await expect(getChapter(db, thea, scene.id)).rejects.toMatchObject({ code: 'not_found' });
    expect(await listChapters(db, town!.id)).toHaveLength(1);

    await setSceneStatus(db, thea, scene.id, 'completed');
    const chapters = await listChapters(db, town!.id);
    expect(chapters.map((chapter) => chapter.number)).toEqual([1, 2]);
    expect(chapters[1]).toMatchObject({ sceneId: scene.id, title: 'The Late Train', characters: ['Captain Thea'], postCount: 2 });

    // The chapter is the story alone: no out-of-character talk.
    const second = await getChapter(db, thea, scene.id);
    expect(second).toMatchObject({ number: 2, of: 2, next: null, previous: { sceneId: before[0]!.sceneId } });
    expect(second.posts.map((post) => post.characterName)).toEqual(['Captain Thea', 'Captain Thea']);
    expect(second.posts.some((post) => post.contentHtml.includes('tea'))).toBe(false);
    expect((await getChapter(db, thea, before[0]!.sceneId)).next).toMatchObject({ sceneId: scene.id });

    // Archived after finishing: still a chapter. Reopened: no longer one.
    await setSceneStatus(db, thea, scene.id, 'archived');
    expect(await listChapters(db, town!.id)).toHaveLength(2);
    await setSceneStatus(db, thea, scene.id, 'active');
    expect(await listChapters(db, town!.id)).toHaveLength(1);
    const [reopened] = await db.select().from(scenes).where(eq(scenes.id, scene.id));
    expect(reopened!.completedAt).toBeNull();
  });

  it('never includes a private scene, finished or not', async () => {
    const { db } = connection;
    const hero = await createCharacter(db, thea, { name: 'Solo' });
    const scene = await createScene(db, thea, { title: 'Alone', rating: 'teen', characterIds: [hero.id], openingPost: docFromText('Quiet.') });
    await setSceneStatus(db, thea, scene.id, 'completed');
    await expect(getChapter(db, thea, scene.id)).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('player roles', () => {
  it('are chosen on a profile, kept to the choices offered, and shown in every community', async () => {
    const { db } = connection;
    const details = { displayName: 'Thea', hideOnline: false };
    const saved = await updateProfile(db, thea, { ...details, playerRoles: ['region:eu', 'pronouns:she', 'pronouns:they', 'dms:ask', 'pronouns:she'] });
    // Shown in a fixed order, whatever order they were chosen in, and without repeats.
    expect(saved.playerRoles.map((role) => role.label)).toEqual(['She/Her', 'They/Them', 'Ask Before DMing', 'Europe']);
    expect((await updateProfile(db, thea, details)).playerRoles).toHaveLength(4);

    const invalid = { code: 'invalid_input' };
    await expect(updateProfile(db, thea, { ...details, playerRoles: ['pronouns:royal'] })).rejects.toMatchObject(invalid);
    await expect(updateProfile(db, thea, { ...details, playerRoles: ['staff'] })).rejects.toMatchObject(invalid);
    // Only one where one is asked for.
    await expect(updateProfile(db, thea, { ...details, playerRoles: ['dms:open', 'dms:closed'] })).rejects.toMatchObject(invalid);

    const [town] = await db.select().from(communities).where(eq(communities.slug, DEMO_COMMUNITY_SLUG));
    const me = (await listMemberPresence(db, town!.id)).find((member) => member.userId === thea.userId);
    expect(me?.playerRoles.map((role) => role.key)).toEqual(['pronouns:she', 'pronouns:they', 'dms:ask', 'region:eu']);
    expect((await getProfileView(db, thea, 'thea')).profile.playerRoles).toHaveLength(4);

    expect((await updateProfile(db, thea, { ...details, playerRoles: [] })).playerRoles).toEqual([]);
  });
});
