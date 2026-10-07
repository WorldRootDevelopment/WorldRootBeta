import { characters, locations, users, worlds, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { eq, isNotNull, isNull } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getCharacterView, listCommunityCharacters } from '../characters/service';
import { getCommunityView, joinCommunity } from '../community/service';
import { createProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { createLocation, listCommunityWorlds, listLocations } from '../worlds/service';
import { seedStarTrekDemo } from './star-trek';

let connection: DbConnection;

beforeAll(async () => {
  connection = await createTestDb();
  await seedStarTrekDemo(connection.db);
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

describe('the Star Trek demo', () => {
  it('is created once', async () => {
    expect(await seedStarTrekDemo(connection.db)).toMatchObject({ created: false });
  });

  it('copies each library world into the community with its whole location tree', async () => {
    const { db } = connection;
    const originals = await db.select().from(worlds).where(isNotNull(worlds.ownerUserId));
    const copies = await db.select().from(worlds).where(isNotNull(worlds.ownerCommunityId));
    expect(originals).toHaveLength(2);
    expect(copies).toHaveLength(2);

    for (const copy of copies) {
      const original = originals.find((world) => world.id === copy.sourceWorldId)!;
      const [from, to] = [await listLocations(db, original.id), await listLocations(db, copy.id)];
      expect(to.map((l) => l.name).sort()).toEqual(from.map((l) => l.name).sort());
      // Copies are new rows whose parents are also copies, never the originals.
      const copyIds = new Set(to.map((l) => l.id));
      expect(to.every((l) => !from.some((o) => o.id === l.id))).toBe(true);
      expect(to.every((l) => l.parentId === null || copyIds.has(l.parentId))).toBe(true);
    }
  });

  it('leaves an original untouched when its copy changes', async () => {
    const { db } = connection;
    const [copy] = await db.select().from(characters).where(isNotNull(characters.communityId)).limit(1);
    await db.update(characters).set({ name: 'Renamed aboard' }).where(eq(characters.id, copy!.id));
    const [original] = await db.select().from(characters).where(eq(characters.id, copy!.sourceCharacterId!));
    expect(original!.name).toBe(copy!.name);
    await db.update(characters).set({ name: copy!.name }).where(eq(characters.id, copy!.id));
    expect(await db.select().from(characters).where(isNull(characters.communityId))).toHaveLength(7);
  });

  it('shows a listed community to a visitor, who can join but not manage it', async () => {
    const { db } = connection;
    const actor = await visitor('visitor@example.com', 'visitor');

    const before = await getCommunityView(db, actor, 'meridian');
    expect(before).toMatchObject({ isMember: false, permissions: [] });

    await joinCommunity(db, actor, before.community.id);
    await joinCommunity(db, actor, before.community.id);
    const after = await getCommunityView(db, actor, 'meridian');
    expect(after.isMember).toBe(true);
    expect(after.memberCount).toBe(2);
    expect(after.permissions.sort()).toEqual(['character.submit', 'lounge.post', 'scene.create', 'scene.join']);

    const [world] = await listCommunityWorlds(db, before.community.id);
    await expect(createLocation(db, actor, world!.id, { name: 'Unauthorised deck' })).rejects.toMatchObject({
      code: 'forbidden',
      permission: 'location.create',
    });
  });

  it('shows crew with the community fields, and hides library originals from other people', async () => {
    const { db } = connection;
    const actor = await visitor('reader@example.com', 'reader');
    const { community } = await getCommunityView(db, actor, 'meridian');

    const crew = await listCommunityCharacters(db, community.id);
    expect(crew).toHaveLength(7);

    const voss = crew.find((c) => c.name === 'Ilara Voss')!;
    const view = await getCharacterView(db, actor, voss.id);
    expect(view.customFields).toEqual([
      { label: 'Rank', value: 'Captain' },
      { label: 'Division', value: 'Command' },
      { label: 'Position', value: 'Commanding Officer' },
    ]);
    expect(view.sourceName).toBeNull();

    await expect(getCharacterView(db, actor, voss.sourceCharacterId!)).rejects.toMatchObject({ code: 'not_found' });
    expect(await db.select().from(locations)).not.toHaveLength(0);
  });
});
