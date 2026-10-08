import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { getLibraryWorld, listLibraryWorlds, listLocations, updateWorld } from '../worlds/service';
import { countLocations, findTemplate, TEMPLATE_CATEGORIES, WORLD_TEMPLATES } from './catalog';
import { createWorldFromTemplate } from './service';

let connection: DbConnection;
let writer: Actor;
let other: Actor;

const addUser = async (handle: string): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com` }).returning();
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

beforeAll(async () => {
  connection = await createTestDb();
  writer = await addUser('writer');
  other = await addUser('other');
});

afterAll(async () => {
  await connection.close();
});

describe('the template catalogue', () => {
  it('is well-formed: unique ids, known categories, and nothing nested deeper than a world allows', () => {
    const ids = WORLD_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    const depth = (locations: NonNullable<(typeof WORLD_TEMPLATES)[number]['locations']>): number =>
      locations.length === 0 ? 0 : 1 + Math.max(...locations.map((location) => depth(location.children ?? [])));
    for (const template of WORLD_TEMPLATES) {
      expect(TEMPLATE_CATEGORIES).toContain(template.category);
      expect(template.locations.length).toBeGreaterThan(0);
      expect(depth(template.locations)).toBeLessThanOrEqual(5);
      expect(template.suggestedFields.length).toBeGreaterThan(0);
    }
    expect(ids).toEqual(expect.arrayContaining(['basic-town', 'dungeons-and-dragons', 'star-wars', 'jurassic-park', 'dc-comics', 'marvel-comics', 'wizarding-school']));
  });
});

describe('creating a world from a template', () => {
  it('builds every template into a library world with all of its locations', async () => {
    const { db } = connection;
    for (const template of WORLD_TEMPLATES) {
      const world = await createWorldFromTemplate(db, writer, template.id);
      expect(world).toMatchObject({ name: template.name, ownerUserId: writer.userId, ownerCommunityId: null, shareCode: null });
      expect(await listLocations(db, world.id)).toHaveLength(countLocations(template.locations));
    }
    expect(await listLibraryWorlds(db, writer.userId)).toHaveLength(WORLD_TEMPLATES.length);
  });

  it('keeps the nesting, gives a private world that is the writer’s to change, and can be used twice', async () => {
    const { db } = connection;
    const world = await createWorldFromTemplate(db, other, 'star-wars');
    const locations = await listLocations(db, world.id);
    const byName = (name: string) => locations.find((location) => location.name === name)!;
    expect(byName('Tatooine').parentId).toBeNull();
    expect(byName('Mos Eisley').parentId).toBe(byName('Tatooine').id);
    expect(byName('The Cantina').parentId).toBe(byName('Mos Eisley').id);

    await expect(getLibraryWorld(db, writer, world.id)).rejects.toMatchObject({ code: 'not_found' });
    expect(await updateWorld(db, other, world.id, { name: 'The Outer Rim' })).toMatchObject({ name: 'The Outer Rim' });
    // The template itself is untouched by anything done to a world made from it.
    expect(findTemplate('star-wars')!.name).toBe('Star Wars');

    const second = await createWorldFromTemplate(db, other, 'star-wars');
    expect(second.slug).toBe('star-wars-2');
  });

  it('refuses a template that does not exist', async () => {
    await expect(createWorldFromTemplate(connection.db, writer, 'no-such-template')).rejects.toMatchObject({ code: 'not_found' });
  });
});
