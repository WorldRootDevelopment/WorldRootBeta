import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Actor } from '../platform/authorize';
import { setPremium } from './badges';
import { createProfile, getProfile } from './profile';
import { setSiteTheme } from './profile-view';

let connection: DbConnection;
let thea: Actor;
let staff: Actor;

const addUser = async (handle: string, platformRole: Actor['platformRole'] = 'user'): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com`, platformRole }).returning();
  const actor: Actor = { userId: user!.id, platformRole };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

beforeAll(async () => {
  connection = await createTestDb();
  thea = await addUser('thea');
  staff = await addUser('warden', 'staff');
});

afterAll(async () => {
  await connection.close();
});

describe('site themes', () => {
  it('come with Heartwood, and the choice is kept but not used while Heartwood is away', async () => {
    const { db } = connection;
    const theme = async () => (await getProfile(db, thea.userId))!.siteTheme;
    expect(await theme()).toBe('default');

    await expect(setSiteTheme(db, thea, 'book')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(setSiteTheme(db, thea, 'vaporwave')).rejects.toMatchObject({ code: 'invalid_input' });
    // The site's own look is anyone's to choose.
    expect(await setSiteTheme(db, thea, 'default')).toBe('default');

    await setPremium(db, staff, thea.userId, true);
    expect(await setSiteTheme(db, thea, 'win95')).toBe('win95');
    expect(await theme()).toBe('win95');

    await setPremium(db, staff, thea.userId, false);
    expect(await theme()).toBe('default');
    await setPremium(db, staff, thea.userId, true);
    expect(await theme()).toBe('win95');

    // Staff always have what Heartwood gives.
    expect(await setSiteTheme(db, staff, 'glass')).toBe('glass');
  });
});
