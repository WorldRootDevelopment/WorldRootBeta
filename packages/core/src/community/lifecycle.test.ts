import { auditLog, characters, communities, locations, scenePosts, scenes, users, worlds, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { docFromText } from '@worldroot/editor';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCharacterToCommunity, createCharacter } from '../characters/service';
import { DEMO_COMMUNITY_SLUG, seedDemo } from '../demo/demo-town';
import { createProfile } from '../identity/profile';
import { getSpace, sendMessage } from '../messaging/service';
import type { Actor } from '../platform/authorize';
import { createPost, createScene, getSceneView } from '../scenes/service';
import { copyWorldToCommunity, createLocation, createWorld, listLibraryWorlds } from '../worlds/service';
import { acceptInvite, createInvite } from './access';
import { deleteCommunity, getAdminView, setCommunityArchived, updateCommunity } from './admin';
import { createCommunity, getCommunityView, joinCommunity, listListedCommunities, listMyCommunities } from './service';

let connection: DbConnection;
let owner: Actor;
let member: Actor;
let stranger: Actor;
let counter = 0;

const addUser = async (handle: string, email = `${handle}@example.com`): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email }).returning();
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

const say = (text: string) => docFromText(text);

/** A listed community with a world, a member, their character and one scene in progress. */
async function populated() {
  const { db } = connection;
  const slug = `valley-${(counter += 1)}`;
  const community = await createCommunity(db, owner, { slug, name: 'Bunn Valley', listed: true });
  const world = await createWorld(db, owner, { name: `Valley ${counter}` });
  const place = await createLocation(db, owner, world.id, { name: 'Baltimore' });
  const copy = await copyWorldToCommunity(db, owner, world.id, community.id);
  const [spot] = await db.select().from(locations).where(eq(locations.worldId, copy.id));
  await joinCommunity(db, member, community.id);
  const original = await createCharacter(db, member, { name: `Sarah ${counter}` });
  const character = await addCharacterToCommunity(db, member, original.id, community.id);
  const scene = await createScene(db, member, {
    title: 'The Late Train',
    rating: 'everyone',
    locationId: spot!.id,
    characterIds: [character.id],
    openingPost: say('The 11:40 was late again.'),
  });
  return { community, slug, world, place, copy, original, character, scene };
}

beforeAll(async () => {
  connection = await createTestDb();
  owner = await addUser('owner');
  member = await addUser('member');
  stranger = await addUser('stranger');
});

afterAll(async () => {
  await connection.close();
});

describe('archiving a community', () => {
  it('freezes it for everyone, hides it from outsiders, and is undone by restoring', async () => {
    const { db } = connection;
    const { community, slug, character, scene, world } = await populated();
    const invite = await createInvite(db, owner, community.id);

    await expect(setCommunityArchived(db, member, community.id, true)).rejects.toMatchObject({ code: 'forbidden' });
    const archived = await setCommunityArchived(db, owner, community.id, true);
    expect(archived.archivedAt).not.toBeNull();

    // Outsiders no longer see it or find it. Members still do, read-only.
    await expect(getCommunityView(db, stranger, slug)).rejects.toMatchObject({ code: 'not_found' });
    expect((await listListedCommunities(db)).some((c) => c.id === community.id)).toBe(false);
    expect((await listMyCommunities(db, member.userId)).some((c) => c.id === community.id)).toBe(true);
    expect(await getCommunityView(db, member, slug)).toMatchObject({ isMember: true, isOwner: false, permissions: [] });
    expect(await getCommunityView(db, owner, slug)).toMatchObject({ isOwner: true, permissions: [] });
    expect((await getSceneView(db, member, scene.id)).scene.title).toBe('The Late Train');

    // Nothing can be added or changed: not by members, and not by the owner either.
    await expect(joinCommunity(db, stranger, community.id)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(acceptInvite(db, stranger, invite.code)).rejects.toMatchObject({ code: 'conflict' });
    await expect(createPost(db, member, scene.id, { kind: 'ic', characterId: character.id, content: say('One more.') })).rejects.toMatchObject({
      code: 'conflict',
    });
    const { conversation } = await getSpace(db, member, community.id, 'lounge');
    await expect(sendMessage(db, member, conversation.id, 'Anyone here?')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(copyWorldToCommunity(db, owner, world.id, community.id)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      updateCommunity(db, owner, community.id, { name: 'Renamed', accentHue: 1, listed: true, requireCharacterApproval: false }),
    ).rejects.toMatchObject({ code: 'forbidden' });
    // The owner is still recognized as the owner, which is what lets them restore or delete it.
    expect(await getAdminView(db, owner, community.id)).toMatchObject({ isOwner: true, permissions: [] });

    await setCommunityArchived(db, owner, community.id, false);
    expect((await getCommunityView(db, stranger, slug)).isMember).toBe(false);
    await expect(createPost(db, member, scene.id, { kind: 'ic', characterId: character.id, content: say('Back again.') })).resolves.toMatchObject({ seq: 2 });
    await expect(sendMessage(db, member, conversation.id, 'We are back.')).resolves.toBeTruthy();

    const actions = (await db.select().from(auditLog).where(eq(auditLog.communityId, community.id))).map((row) => row.action);
    expect(actions).toEqual(expect.arrayContaining(['community.archive', 'community.restore']));
  });
});

describe('deleting a community', () => {
  it('needs the owner and the name, removes everything inside, and leaves library originals alone', async () => {
    const { db } = connection;
    const { community, slug, world, copy, original, character, scene } = await populated();

    await expect(deleteCommunity(db, member, community.id, 'Bunn Valley')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(deleteCommunity(db, owner, community.id, 'Bunn Vally')).rejects.toMatchObject({
      code: 'invalid_input',
      fields: { confirmName: expect.any(String) },
    });
    expect(await db.select().from(communities).where(eq(communities.id, community.id))).toHaveLength(1);

    await deleteCommunity(db, owner, community.id, '  bunn valley ');

    await expect(getCommunityView(db, owner, slug)).rejects.toMatchObject({ code: 'not_found' });
    expect(await db.select().from(worlds).where(eq(worlds.id, copy.id))).toEqual([]);
    expect(await db.select().from(locations).where(eq(locations.worldId, copy.id))).toEqual([]);
    expect(await db.select().from(characters).where(eq(characters.id, character.id))).toEqual([]);
    expect(await db.select().from(scenes).where(eq(scenes.id, scene.id))).toEqual([]);
    expect(await db.select().from(scenePosts).where(eq(scenePosts.sceneId, scene.id))).toEqual([]);

    // What people made in their own libraries is theirs, and stays.
    expect((await listLibraryWorlds(db, owner.userId)).some((w) => w.id === world.id)).toBe(true);
    expect(await db.select().from(characters).where(eq(characters.id, original.id))).toHaveLength(1);
    // The record that it was deleted outlives it.
    const [entry] = await db.select().from(auditLog).where(eq(auditLog.action, 'community.delete'));
    expect(entry).toMatchObject({ targetId: community.id, before: { name: 'Bunn Valley', slug } });
  });

  it('can delete a community that is archived', async () => {
    const { db } = connection;
    const { community } = await populated();
    await setCommunityArchived(db, owner, community.id, true);
    await deleteCommunity(db, owner, community.id, 'Bunn Valley');
    expect(await db.select().from(communities).where(eq(communities.id, community.id))).toEqual([]);
  });
});

describe('the old demo', () => {
  it('is removed on start, along with its account, without touching anyone else’s community of the same name', async () => {
    const { db } = connection;
    const oldDemo = await addUser('meridian_gm', 'demo@worldroot.test');
    const oldCommunity = await createCommunity(db, oldDemo, { slug: 'meridian', name: 'USS Meridian', listed: true });
    await createWorld(db, oldDemo, { name: 'Old Demo World' });
    const fans = await createCommunity(db, owner, { slug: 'uss-meridian-fans', name: 'USS Meridian', listed: true });

    await seedDemo(db);

    expect(await db.select().from(communities).where(eq(communities.id, oldCommunity.id))).toEqual([]);
    expect(await db.select().from(users).where(eq(users.email, 'demo@worldroot.test'))).toEqual([]);
    expect(await db.select().from(worlds).where(eq(worlds.ownerUserId, oldDemo.userId))).toEqual([]);
    expect(await db.select().from(communities).where(eq(communities.id, fans.id))).toHaveLength(1);
    expect((await getCommunityView(db, owner, DEMO_COMMUNITY_SLUG)).community.name).toBe('Demo Town');
  });
});
