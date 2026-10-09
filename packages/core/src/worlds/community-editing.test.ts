import { auditLog, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { and, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assignRole, createManagedRole, setCommunityArchived } from '../community/admin';
import { createCommunity, joinCommunity } from '../community/service';
import type { Actor } from '../platform/authorize';
import { copyWorldToCommunity, createLocation, createWorld, getLibraryWorld, listLocations, updateLocation, updateWorld, worldPowers } from './service';

let connection: DbConnection;

const addUser = async (name: string, isStaff = false): Promise<Actor> => {
  const [user] = await connection.db
    .insert(users)
    .values({ name, email: `${name}@example.com`, platformRole: isStaff ? 'staff' : 'user' })
    .returning();
  return { userId: user!.id, platformRole: isStaff ? 'staff' : 'user' };
};

const all = { editWorld: true, addLocations: true, editLocations: true };
const none = { editWorld: false, addLocations: false, editLocations: false };

beforeAll(async () => {
  connection = await createTestDb();
});

afterAll(async () => {
  await connection.close();
});

describe('a community’s copy of a world', () => {
  it('is changed by the community staff who hold the permission, and by nobody else', async () => {
    const { db } = connection;
    const founder = await addUser('founder');
    const lorekeeper = await addUser('lorekeeper');
    const mapper = await addUser('mapper');
    const member = await addUser('member');
    const outsider = await addUser('outsider');
    const rootwarden = await addUser('rootwarden', true);

    const community = await createCommunity(db, founder, { slug: 'keep', name: 'The Keep', listed: true });
    for (const person of [lorekeeper, mapper, member]) await joinCommunity(db, person, community.id);
    const original = await createWorld(db, founder, { name: 'Realm', description: 'As first written.' });
    await createLocation(db, founder, original.id, { name: 'Gate' });
    const copy = await copyWorldToCommunity(db, founder, original.id, community.id);
    const [gate] = await listLocations(db, copy.id);

    // The owner of the community can change everything about its copy, and so can WorldRoot staff.
    expect(await worldPowers(db, founder, copy)).toEqual(all);
    expect(await worldPowers(db, rootwarden, copy)).toEqual(all);
    // An ordinary member and someone outside the community can change nothing.
    for (const person of [member, outsider]) {
      expect(await worldPowers(db, person, copy)).toEqual(none);
      await expect(updateWorld(db, person, copy.id, { name: 'Mine now' })).rejects.toMatchObject({ code: 'forbidden' });
      await expect(createLocation(db, person, copy.id, { name: 'Shed' })).rejects.toMatchObject({ code: 'forbidden' });
      await expect(updateLocation(db, person, gate!.id, { name: 'Mine too' })).rejects.toMatchObject({ code: 'forbidden' });
    }

    // Staff are whoever the owner gives the permissions to. Each permission opens exactly its own part.
    const fullRole = await createManagedRole(db, founder, community.id, { name: 'Lorekeeper', permissions: ['world.manage', 'location.create', 'location.manage'] });
    await assignRole(db, founder, fullRole.id, lorekeeper.userId);
    const addOnly = await createManagedRole(db, founder, community.id, { name: 'Mapper', permissions: ['location.create'] });
    await assignRole(db, founder, addOnly.id, mapper.userId);
    expect(await worldPowers(db, lorekeeper, copy)).toEqual(all);
    expect(await worldPowers(db, mapper, copy)).toEqual({ editWorld: false, addLocations: true, editLocations: false });

    const edited = await updateWorld(db, lorekeeper, copy.id, { name: 'The Realm', summary: 'Revised by the Keep.', description: 'As the Keep tells it.' });
    expect(edited).toMatchObject({ name: 'The Realm', summary: 'Revised by the Keep.', description: 'As the Keep tells it.', slug: copy.slug });
    const hall = await createLocation(db, lorekeeper, copy.id, { name: 'Great Hall', parentId: gate!.id });
    await updateLocation(db, lorekeeper, gate!.id, { name: 'North Gate', summary: 'The only way in.' });
    await createLocation(db, mapper, copy.id, { name: 'Stables' });
    await expect(updateLocation(db, mapper, hall.id, { name: 'Lesser Hall' })).rejects.toMatchObject({ code: 'forbidden' });
    await expect(updateWorld(db, mapper, copy.id, { name: 'Mapper’s Realm' })).rejects.toMatchObject({ code: 'forbidden' });
    expect((await listLocations(db, copy.id)).map((location) => location.name).sort()).toEqual(['Great Hall', 'North Gate', 'Stables']);

    // The original in the founder's library is untouched by any of it, and the lorekeeper has no say over it.
    expect(await getLibraryWorld(db, founder, original.id)).toMatchObject({ name: 'Realm', description: 'As first written.' });
    expect((await listLocations(db, original.id)).map((location) => location.name)).toEqual(['Gate']);
    await expect(updateWorld(db, lorekeeper, original.id, { name: 'Not yours' })).rejects.toMatchObject({ code: 'forbidden' });

    // Every change to the community's copy is in the community's record.
    const recorded = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(and(eq(auditLog.communityId, community.id), inArray(auditLog.action, ['world.update', 'location.create', 'location.update'])));
    expect(recorded.map((row) => row.action).sort()).toEqual(['location.create', 'location.create', 'location.update', 'world.update']);

    // Once the community is archived its worlds are closed to everyone, staff included.
    await setCommunityArchived(db, founder, community.id, true);
    expect(await worldPowers(db, lorekeeper, copy)).toEqual(none);
    expect(await worldPowers(db, founder, copy)).toEqual(none);
    // An archived community grants its roles nothing, so the owner and the lorekeeper are simply refused.
    for (const person of [founder, lorekeeper]) {
      await expect(updateWorld(db, person, copy.id, { name: 'Too late' })).rejects.toMatchObject({ code: 'forbidden' });
      await expect(createLocation(db, person, copy.id, { name: 'Too late' })).rejects.toMatchObject({ code: 'forbidden' });
      await expect(updateLocation(db, person, hall.id, { name: 'Too late' })).rejects.toMatchObject({ code: 'forbidden' });
    }
    // WorldRoot staff pass every permission check, so they are stopped by the archive itself and told why.
    expect(await worldPowers(db, rootwarden, copy)).toEqual(none);
    await expect(updateWorld(db, rootwarden, copy.id, { name: 'Too late' })).rejects.toMatchObject({ code: 'conflict' });
    await expect(createLocation(db, rootwarden, copy.id, { name: 'Too late' })).rejects.toMatchObject({ code: 'conflict' });
    await expect(updateLocation(db, rootwarden, hall.id, { name: 'Too late' })).rejects.toMatchObject({ code: 'conflict' });
    expect((await listLocations(db, copy.id)).map((location) => location.name)).not.toContain('Too late');
  });
});
