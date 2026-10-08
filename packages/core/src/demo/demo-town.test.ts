import { characters, scenes, users, worlds, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { eq, isNotNull, isNull } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getCharacterView, listCommunityCharacters } from '../characters/service';
import { getCommunityView, joinCommunity } from '../community/service';
import { createProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { listPosts } from '../scenes/service';
import { createLocation, listCommunityWorlds, listLocations } from '../worlds/service';
import { addCharacterToCommunity, createCharacter } from '../characters/service';
import { listCharacterFields } from '../community/service';
import { DEMO_ACCOUNT, DEMO_COMMUNITY_SLUG, seedDemo } from './demo-town';

let connection: DbConnection;

beforeAll(async () => {
  connection = await createTestDb();
  await seedDemo(connection.db);
});

afterAll(async () => {
  await connection.close();
});

const visitor = async (email: string, handle: string): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email }).returning();
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

describe('the demo town', () => {
  it('is created once', async () => {
    expect(await seedDemo(connection.db)).toEqual({ created: false, communitySlug: DEMO_COMMUNITY_SLUG });
    expect(await connection.db.select().from(scenes)).toHaveLength(2);
  });

  it('copies the library world into the community with its whole location tree', async () => {
    const { db } = connection;
    const [original] = await db.select().from(worlds).where(isNotNull(worlds.ownerUserId));
    const [copy] = await db.select().from(worlds).where(isNotNull(worlds.ownerCommunityId));
    expect(copy).toMatchObject({ name: 'Demo Town', sourceWorldId: original!.id });

    const [from, to] = [await listLocations(db, original!.id), await listLocations(db, copy!.id)];
    expect(to.map((l) => l.name).sort()).toEqual(from.map((l) => l.name).sort());
    expect(to.map((l) => l.name)).toEqual(expect.arrayContaining(['Town Square', 'The Fountain', 'The Corner Café', 'Train Station']));
    // Copies are new rows whose parents are also copies, never the originals.
    const copyIds = new Set(to.map((l) => l.id));
    expect(to.every((l) => !from.some((o) => o.id === l.id))).toBe(true);
    expect(to.every((l) => l.parentId === null || copyIds.has(l.parentId))).toBe(true);
  });

  it('leaves an original untouched when its copy changes', async () => {
    const { db } = connection;
    const [copy] = await db.select().from(characters).where(isNotNull(characters.communityId)).limit(1);
    await db.update(characters).set({ name: 'Renamed in town' }).where(eq(characters.id, copy!.id));
    const [original] = await db.select().from(characters).where(eq(characters.id, copy!.sourceCharacterId!));
    expect(original!.name).toBe(copy!.name);
    await db.update(characters).set({ name: copy!.name }).where(eq(characters.id, copy!.id));
    expect(await db.select().from(characters).where(isNull(characters.communityId))).toHaveLength(1);
  });

  it('shows a listed community to a visitor, who can join but not manage it', async () => {
    const { db } = connection;
    const actor = await visitor('visitor@example.com', 'visitor');

    const before = await getCommunityView(db, actor, DEMO_COMMUNITY_SLUG);
    expect(before).toMatchObject({ isMember: false, permissions: [] });

    await joinCommunity(db, actor, before.community.id);
    await joinCommunity(db, actor, before.community.id);
    const after = await getCommunityView(db, actor, DEMO_COMMUNITY_SLUG);
    expect(after.isMember).toBe(true);
    expect(after.memberCount).toBe(2);
    expect(after.permissions.sort()).toEqual(['character.submit', 'lounge.post', 'scene.create', 'scene.join']);

    const [world] = await listCommunityWorlds(db, before.community.id);
    await expect(createLocation(db, actor, world!.id, { name: 'Unapproved Car Park' })).rejects.toMatchObject({
      code: 'forbidden',
      permission: 'location.create',
    });
  });

  it('has one character, the Narrator, and hides its library original from other people', async () => {
    const { db } = connection;
    const actor = await visitor('reader@example.com', 'reader');
    const { community } = await getCommunityView(db, actor, DEMO_COMMUNITY_SLUG);

    const cast = await listCommunityCharacters(db, community.id);
    expect(cast.map((c) => c.name)).toEqual(['Narrator']);

    const view = await getCharacterView(db, actor, cast[0]!.id);
    expect(view.customFields).toEqual([{ label: 'Occupation', value: 'Storyteller' }]);
    await expect(getCharacterView(db, actor, cast[0]!.sourceCharacterId!)).rejects.toMatchObject({ code: 'not_found' });
  });

  it('clears out characters left by earlier demos, and nobody else\'s', async () => {
    const { db } = connection;
    const [host] = await db.select().from(users).where(eq(users.email, DEMO_ACCOUNT.email));
    const demoActor: Actor = { userId: host!.id, platformRole: 'user' };
    const { community } = await getCommunityView(db, demoActor, DEMO_COMMUNITY_SLUG);
    const fields = await listCharacterFields(db, community.id);
    const values = Object.fromEntries(fields.map((field) => [field.id, 'Leftover']));

    // A resident from an earlier demo, in the library and in the community.
    const stale = await createCharacter(db, demoActor, { name: 'June Park' });
    await addCharacterToCommunity(db, demoActor, stale.id, community.id, { customValues: values });
    // A real person's character, which happens to share the name.
    const person = await visitor('keeper@example.com', 'keeper');
    await joinCommunity(db, person, community.id);
    const theirs = await createCharacter(db, person, { name: 'June Park' });
    await addCharacterToCommunity(db, person, theirs.id, community.id, { customValues: values });

    await seedDemo(db);

    const names = (await listCommunityCharacters(db, community.id)).map((c) => [c.name, c.playerUserId]);
    expect(names).toEqual(expect.arrayContaining([['Narrator', host!.id], ['June Park', person.userId]]));
    expect(names).toHaveLength(2);
    const library = await db.select().from(characters).where(isNull(characters.communityId));
    expect(library.filter((c) => c.playerUserId === host!.id).map((c) => c.name)).toEqual(['Narrator']);
    expect(library.some((c) => c.playerUserId === person.userId)).toBe(true);
  });

  it('has an open scene and a finished one that read as stories', async () => {
    const { db } = connection;
    const actor = await visitor('browser@example.com', 'browser');
    const all = await db.select().from(scenes);
    const open = all.find((scene) => scene.title === 'The 11:40')!;
    const done = all.find((scene) => scene.title === 'Closing Time')!;
    expect([open.status, done.status]).toEqual(['active', 'completed']);

    const story = await listPosts(db, actor, open.id, { stream: 'story' });
    expect(story.posts.map((post) => post.characterName)).toEqual(['Narrator', 'Narrator', 'Narrator']);
    expect(story.posts[0]!.contentHtml).toContain('<em>');
    expect((await listPosts(db, actor, open.id, { stream: 'ooc' })).posts).toHaveLength(1);
  });
});
