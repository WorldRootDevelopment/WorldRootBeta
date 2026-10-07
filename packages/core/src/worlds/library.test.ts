import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCharacter, getCharacterView, updateCharacter } from '../characters/service';
import type { Actor } from '../platform/authorize';
import { slugify } from '../platform/validate';
import { createLocation, createWorld, getLibraryWorld, listLocations, updateLocation, updateWorld } from './service';

let connection: DbConnection;
let owner: Actor;
let stranger: Actor;

const addUser = async (email: string): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: 'Test', email }).returning();
  return { userId: user!.id, platformRole: 'user' };
};

beforeAll(async () => {
  connection = await createTestDb();
  owner = await addUser('owner@example.com');
  stranger = await addUser('stranger@example.com');
});

afterAll(async () => {
  await connection.close();
});

describe('slugify', () => {
  it('makes a URL-safe slug from a name', () => {
    expect(slugify('  Bunn Valley!  ')).toBe('bunn-valley');
    expect(slugify('Café Noir & Co.')).toBe('cafe-noir-co');
    expect(slugify('***')).toBe('');
  });
});

describe('library characters', () => {
  it('needs only a name, and stores empty fields as null', async () => {
    const character = await createCharacter(connection.db, owner, { name: '  Sarah  ', tagline: '   ' });
    expect(character).toMatchObject({ name: 'Sarah', tagline: null, playerUserId: owner.userId, communityId: null });
  });

  it('refuses a missing name and reports the field', async () => {
    await expect(createCharacter(connection.db, owner, { name: '   ' })).rejects.toMatchObject({
      code: 'invalid_input',
      fields: { name: 'Enter a name.' },
    });
  });

  it('is edited by its owner only, and is invisible to anyone else', async () => {
    const { db } = connection;
    const character = await createCharacter(db, owner, { name: 'Marcus' });

    const updated = await updateCharacter(db, owner, character.id, { name: 'Marcus Hale', species: 'Human' });
    expect(updated).toMatchObject({ name: 'Marcus Hale', species: 'Human' });
    expect((await getCharacterView(db, owner, character.id)).canEdit).toBe(true);

    await expect(updateCharacter(db, stranger, character.id, { name: 'Stolen' })).rejects.toMatchObject({ code: 'forbidden' });
    await expect(getCharacterView(db, stranger, character.id)).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('library worlds', () => {
  it('derives a unique address from the name', async () => {
    const { db } = connection;
    const first = await createWorld(db, owner, { name: 'Bunn Valley' });
    const second = await createWorld(db, owner, { name: 'Bunn Valley' });
    const other = await createWorld(db, stranger, { name: 'Bunn Valley' });
    expect([first.slug, second.slug, other.slug]).toEqual(['bunn-valley', 'bunn-valley-2', 'bunn-valley']);
  });

  it('is edited and seen by its owner only', async () => {
    const { db } = connection;
    const world = await createWorld(db, owner, { name: 'Starfall' });
    expect(await updateWorld(db, owner, world.id, { name: 'Starfall', summary: 'A station at the edge.' })).toMatchObject({
      summary: 'A station at the edge.',
      slug: 'starfall',
    });
    await expect(updateWorld(db, stranger, world.id, { name: 'Mine now' })).rejects.toMatchObject({ code: 'forbidden' });
    await expect(getLibraryWorld(db, stranger, world.id)).rejects.toMatchObject({ code: 'not_found' });
  });

  it('adds locations in order, nests them, and stops at five levels', async () => {
    const { db } = connection;
    const world = await createWorld(db, owner, { name: 'Deep Places' });
    const city = await createLocation(db, owner, world.id, { name: 'Baltimore' });
    const station = await createLocation(db, owner, world.id, { name: 'Penn Station', parentId: city.id });
    const second = await createLocation(db, owner, world.id, { name: 'Annapolis' });
    expect([city.position, station.position, second.position]).toEqual([0, 1, 2]);

    let parentId = station.id;
    for (const name of ['Concourse', 'Platform 4', 'The Late Train']) {
      parentId = (await createLocation(db, owner, world.id, { name, parentId })).id;
    }
    await expect(createLocation(db, owner, world.id, { name: 'Too deep', parentId })).rejects.toMatchObject({
      code: 'invalid_input',
    });

    expect(await updateLocation(db, owner, station.id, { name: 'Penn Station', summary: 'Always running late.' })).toMatchObject({
      summary: 'Always running late.',
    });
    await expect(createLocation(db, stranger, world.id, { name: 'Squat' })).rejects.toMatchObject({ code: 'forbidden' });
    await expect(updateLocation(db, stranger, station.id, { name: 'Renamed' })).rejects.toMatchObject({ code: 'forbidden' });
    expect(await listLocations(db, world.id)).toHaveLength(6);
  });

  it('refuses a parent from another world', async () => {
    const { db } = connection;
    const a = await createWorld(db, owner, { name: 'World A' });
    const b = await createWorld(db, owner, { name: 'World B' });
    const inA = await createLocation(db, owner, a.id, { name: 'Somewhere' });
    await expect(createLocation(db, owner, b.id, { name: 'Elsewhere', parentId: inA.id })).rejects.toMatchObject({
      code: 'invalid_input',
    });
  });
});
