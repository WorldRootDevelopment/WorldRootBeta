import { profiles, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { listMemberPresence, ONLINE_WINDOW_SECONDS, touchPresence } from './presence';
import { createCommunity, joinCommunity } from './service';

let connection: DbConnection;

const addUser = async (handle: string): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com` }).returning();
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

beforeAll(async () => {
  connection = await createTestDb();
});

afterAll(async () => {
  await connection.close();
});

describe('presence', () => {
  it('lists members online first, and lets them go offline when they stop checking in', async () => {
    const { db } = connection;
    const owner = await addUser('owner');
    const zed = await addUser('zed');
    const amy = await addUser('amy');
    const stranger = await addUser('stranger');
    const community = await createCommunity(db, owner, { slug: 'valley', name: 'Valley', listed: true });
    await joinCommunity(db, zed, community.id);
    await joinCommunity(db, amy, community.id);

    // Nobody has checked in yet.
    expect((await listMemberPresence(db, community.id)).map((row) => [row.handle, row.online])).toEqual([
      ['owner', false],
      ['zed', false],
      ['amy', false],
    ]);

    await touchPresence(db, amy);
    await touchPresence(db, stranger);
    const now = await listMemberPresence(db, community.id);
    // Online first; among the rest the owner outranks ordinary members. Non-members never appear.
    expect(now.map((row) => [row.handle, row.online])).toEqual([
      ['amy', true],
      ['owner', false],
      ['zed', false],
    ]);
    expect(now.find((row) => row.handle === 'owner')!.role).toBe('Owner');
    expect(now.find((row) => row.handle === 'amy')!.role).toBeNull();

    // A check-in older than the window no longer counts.
    await db
      .update(profiles)
      .set({ lastSeenAt: new Date(Date.now() - (ONLINE_WINDOW_SECONDS + 5) * 1000) })
      .where(eq(profiles.userId, amy.userId));
    expect((await listMemberPresence(db, community.id)).some((row) => row.online)).toBe(false);

    // Checking in again brings them back, and a second check-in straight after is skipped without error.
    await touchPresence(db, amy);
    const [first] = await db.select({ at: profiles.lastSeenAt }).from(profiles).where(eq(profiles.userId, amy.userId));
    await touchPresence(db, amy);
    const [second] = await db.select({ at: profiles.lastSeenAt }).from(profiles).where(eq(profiles.userId, amy.userId));
    expect(second!.at!.getTime()).toBe(first!.at!.getTime());
    expect((await listMemberPresence(db, community.id))[0]).toMatchObject({ handle: 'amy', online: true });
  });
});
