import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Actor } from '../platform/authorize';
import { setPremium } from './badges';
import { createCodeBatch, redeemCode } from './codes';
import { hasPremium, heartwoodEnds } from './plan';
import { createProfile, getProfile } from './profile';

let connection: DbConnection;
let member: Actor;
let staff: Actor;

const addUser = async (handle: string, platformRole: Actor['platformRole'] = 'user'): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com`, platformRole }).returning();
  const actor: Actor = { userId: user!.id, platformRole };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

const monthsFromNow = (date: Date | null | undefined) => (date ? Math.round((date.getTime() - Date.now()) / (30.44 * 86_400_000)) : date);

beforeAll(async () => {
  connection = await createTestDb();
  member = await addUser('member');
  staff = await addUser('warden', 'staff');
});

afterAll(async () => {
  await connection.close();
});

describe('Heartwood by the month', () => {
  it('adds months to the time left, lapses when the end date passes, and an endless membership stays endless', async () => {
    const { db } = connection;
    expect(await heartwoodEnds(db, member.userId)).toBeUndefined();

    await setPremium(db, staff, member.userId, true, 1);
    expect(monthsFromNow(await heartwoodEnds(db, member.userId))).toBe(1);
    // A code for three more months goes on top.
    const [code] = await createCodeBatch(db, staff, { batch: 'Kickstarter: 3 Months', references: 'x', grantsHeartwood: true, grantsMonths: 3, grantsBadge: 'kickstarter' });
    expect(await redeemCode(db, member, code!.code)).toEqual({ heartwood: true, months: 3, badge: 'kickstarter' });
    expect(monthsFromNow(await heartwoodEnds(db, member.userId))).toBe(4);

    // The end date passes: Heartwood is off, its badge goes, the other badge stays.
    await db.update(users).set({ premiumUntil: new Date(Date.now() - 1000) }).where(eq(users.id, member.userId));
    expect(await hasPremium(db, member)).toBe(false);
    expect(await heartwoodEnds(db, member.userId)).toBeUndefined();
    const badges = (await getProfile(db, member.userId))!.badges;
    expect(badges).not.toContain('premium');
    expect(badges).toContain('kickstarter');

    // Given again after lapsing: counted from today, not from the old end date.
    await setPremium(db, staff, member.userId, true, 1);
    expect(monthsFromNow(await heartwoodEnds(db, member.userId))).toBe(1);

    // No end, and then more months: still no end.
    await setPremium(db, staff, member.userId, true, null);
    expect(await heartwoodEnds(db, member.userId)).toBeNull();
    await setPremium(db, staff, member.userId, true, 12);
    expect(await heartwoodEnds(db, member.userId)).toBeNull();

    await expect(setPremium(db, staff, member.userId, true, 0)).rejects.toMatchObject({ code: 'invalid_input' });
    await setPremium(db, staff, member.userId, false);
    expect(await hasPremium(db, member)).toBe(false);
  });
});
