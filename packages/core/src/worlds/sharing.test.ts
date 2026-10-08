import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listAuditLog } from '../community/admin';
import { createCommunity, joinCommunity, type Community } from '../community/service';
import { createProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import {
  copyWorldToCommunity,
  createLocation,
  createWorld,
  importSharedWorld,
  listCommunityWorlds,
  listLibraryWorlds,
  listLocations,
  setWorldSharing,
  updateWorld,
  type World,
} from './service';

let connection: DbConnection;
let author: Actor;
let admin: Actor;
let member: Actor;
let community: Community;
let world: World;

const addUser = async (handle: string): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com` }).returning();
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

beforeAll(async () => {
  connection = await createTestDb();
  const { db } = connection;
  author = await addUser('author');
  admin = await addUser('admin');
  member = await addUser('member');
  community = await createCommunity(db, admin, { slug: 'valley', name: 'Valley', listed: true });
  await joinCommunity(db, author, community.id);
  await joinCommunity(db, member, community.id);

  world = await createWorld(db, author, { name: 'Bunn Valley', summary: 'A river town.' });
  const city = await createLocation(db, author, world.id, { name: 'Baltimore' });
  await createLocation(db, author, world.id, { name: 'Penn Station', parentId: city.id });
});

afterAll(async () => {
  await connection.close();
});

describe('adding worlds to a community', () => {
  it('is for those who hold "Add worlds", and never for ordinary members', async () => {
    const { db } = connection;
    // The author owns the world and belongs to the community, but is not one of its admins.
    await expect(copyWorldToCommunity(db, author, world.id, community.id)).rejects.toMatchObject({ code: 'forbidden', permission: 'world.add' });
    // An admin cannot take a world they do not own by guessing its internal id.
    await expect(copyWorldToCommunity(db, admin, world.id, community.id)).rejects.toMatchObject({ code: 'forbidden' });
    expect(await listCommunityWorlds(db, community.id)).toEqual([]);
  });
});

describe('sharing a world by ID', () => {
  it('lets the owner hand out an ID that an admin can add to their community', async () => {
    const { db } = connection;
    expect(world.shareCode).toBeNull();
    await expect(setWorldSharing(db, admin, world.id, true)).rejects.toMatchObject({ code: 'not_found' });

    const shared = await setWorldSharing(db, author, world.id, true);
    expect(shared.shareCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    // Asking again keeps the same ID.
    expect((await setWorldSharing(db, author, world.id, true)).shareCode).toBe(shared.shareCode);
    const code = shared.shareCode!;

    // Holding the ID is not enough on its own: the community still decides who adds worlds.
    await expect(copyWorldToCommunity(db, member, { shareCode: code }, community.id)).rejects.toMatchObject({
      code: 'forbidden',
      permission: 'world.add',
    });
    await expect(copyWorldToCommunity(db, admin, { shareCode: 'ZZZZ-ZZZZ' }, community.id)).rejects.toMatchObject({ code: 'not_found' });
    await expect(copyWorldToCommunity(db, admin, { shareCode: 'nonsense' }, community.id)).rejects.toMatchObject({ code: 'not_found' });

    // The ID is accepted however it is typed.
    const copy = await copyWorldToCommunity(db, admin, { shareCode: ` ${code.toLowerCase().replace('-', ' ')} ` }, community.id);
    expect(copy).toMatchObject({ name: 'Bunn Valley', ownerCommunityId: community.id, sourceWorldId: world.id, shareCode: null, slug: 'bunn-valley' });
    expect((await listLocations(db, copy.id)).map((location) => location.name).sort()).toEqual(['Baltimore', 'Penn Station']);

    // Adding it a second time makes a second, separately addressed copy.
    const again = await copyWorldToCommunity(db, admin, { shareCode: code }, community.id);
    expect(again.slug).toBe('bunn-valley-2');

    const [entry] = (await listAuditLog(db, admin, community.id)).filter((row) => row.action === 'world.add');
    expect(entry).toMatchObject({ actorHandle: 'admin', after: { byWorldId: true, locations: 2 } });
  });

  it('lets someone take a copy into their own library, independent of the original', async () => {
    const { db } = connection;
    const code = (await setWorldSharing(db, author, world.id, true)).shareCode!;
    await expect(importSharedWorld(db, author, code)).rejects.toMatchObject({ code: 'invalid_input' });

    const mine = await importSharedWorld(db, member, code);
    expect(mine).toMatchObject({ ownerUserId: member.userId, sourceWorldId: world.id, shareCode: null });
    expect(await listLocations(db, mine.id)).toHaveLength(2);

    // The copy belongs to its new owner, who may change it. The original does not move.
    await updateWorld(db, member, mine.id, { name: 'My Valley' });
    await expect(updateWorld(db, member, world.id, { name: 'Hijacked' })).rejects.toMatchObject({ code: 'forbidden' });
    expect((await listLibraryWorlds(db, author.userId)).map((w) => w.name)).toEqual(['Bunn Valley']);
  });

  it('stops working when the owner turns sharing off, without touching copies already made', async () => {
    const { db } = connection;
    const code = (await setWorldSharing(db, author, world.id, true)).shareCode!;
    const before = (await listCommunityWorlds(db, community.id)).length;

    expect((await setWorldSharing(db, author, world.id, false)).shareCode).toBeNull();
    await expect(copyWorldToCommunity(db, admin, { shareCode: code }, community.id)).rejects.toMatchObject({ code: 'not_found' });
    await expect(importSharedWorld(db, member, code)).rejects.toMatchObject({ code: 'not_found' });
    expect(await listCommunityWorlds(db, community.id)).toHaveLength(before);

    // Sharing again issues a new ID. The old one stays dead.
    const fresh = (await setWorldSharing(db, author, world.id, true)).shareCode!;
    expect(fresh).not.toBe(code);
  });
});
