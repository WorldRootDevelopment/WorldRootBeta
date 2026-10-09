import { auditLog, sessions, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCharacter } from '../characters/service';
import { createCommunity } from '../community/service';
import type { Actor } from '../platform/authorize';
import { createProfile } from './profile';
import { getAccountForStaff, getSuspension, restoreAccount, signOutAccount, suspendAccount } from './staff-accounts';

let connection: DbConnection;

const addUser = async (handle: string, isStaff = false, withProfile = true): Promise<Actor> => {
  const [user] = await connection.db
    .insert(users)
    .values({ name: handle, email: `${handle}@example.com`, platformRole: isStaff ? 'staff' : 'user' })
    .returning();
  const actor: Actor = { userId: user!.id, platformRole: isStaff ? 'staff' : 'user' };
  if (withProfile) await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};
const signIn = (userId: string, token: string) =>
  connection.db.insert(sessions).values({ userId, token, expiresAt: new Date(Date.now() + 86_400_000) });

beforeAll(async () => {
  connection = await createTestDb();
});

afterAll(async () => {
  await connection.close();
});

describe('managing an account as staff', () => {
  it('shows the account, suspends and restores it, and signs it out, leaving a record each time', async () => {
    const { db } = connection;
    const staff = await addUser('staffer', true);
    const otherStaff = await addUser('colleague', true);
    const marcus = await addUser('marcus');
    const bystander = await addUser('bystander');
    const fresh = await addUser('fresh', false, false);
    await createCharacter(db, marcus, { name: 'Hale' });
    await createCommunity(db, marcus, { slug: 'valley', name: 'Valley' });
    await signIn(marcus.userId, 'token-a');
    await signIn(marcus.userId, 'token-b');

    // Only staff can look, and an account that has not finished setting up can still be managed.
    await expect(getAccountForStaff(db, bystander, marcus.userId)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(getAccountForStaff(db, staff, '00000000-0000-7000-8000-000000000000')).rejects.toMatchObject({ code: 'not_found' });
    expect(await getAccountForStaff(db, staff, fresh.userId)).toMatchObject({ profile: null, email: 'fresh@example.com' });
    expect(await getAccountForStaff(db, staff, marcus.userId)).toMatchObject({
      email: 'marcus@example.com',
      isStaff: false,
      suspendedAt: null,
      sessions: 2,
      characters: 1,
      communities: [{ slug: 'valley', owner: true }],
      profile: { handle: 'marcus' },
    });

    await expect(suspendAccount(db, bystander, marcus.userId, 'Spite')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(suspendAccount(db, staff, marcus.userId, '   ')).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(suspendAccount(db, staff, staff.userId, 'Oops')).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(suspendAccount(db, staff, otherStaff.userId, 'Disagreement')).rejects.toMatchObject({ code: 'forbidden' });
    expect(await getSuspension(db, marcus.userId)).toBeNull();

    await suspendAccount(db, staff, marcus.userId, ' Repeated harassment after two warnings. ');
    expect(await getSuspension(db, marcus.userId)).toMatchObject({ reason: 'Repeated harassment after two warnings.' });
    // Suspending signs the account out everywhere. Nothing of theirs is removed.
    const suspended = await getAccountForStaff(db, staff, marcus.userId);
    expect(suspended).toMatchObject({ sessions: 0, characters: 1, suspensionReason: 'Repeated harassment after two warnings.' });
    expect(suspended.history[0]).toMatchObject({ action: 'platform.account.suspend', by: 'staffer' });

    await restoreAccount(db, staff, marcus.userId);
    await restoreAccount(db, staff, marcus.userId);
    expect(await getSuspension(db, marcus.userId)).toBeNull();

    await signIn(marcus.userId, 'token-c');
    await expect(signOutAccount(db, bystander, marcus.userId)).rejects.toMatchObject({ code: 'forbidden' });
    expect(await signOutAccount(db, staff, marcus.userId)).toBe(1);
    expect(await db.select().from(sessions).where(eq(sessions.userId, marcus.userId))).toEqual([]);
    const actions = (await db.select().from(auditLog).where(eq(auditLog.targetId, marcus.userId))).map((row) => row.action).filter((action) => action.startsWith('platform.account'));
    expect(actions.sort()).toEqual(['platform.account.restore', 'platform.account.sign_out', 'platform.account.suspend']);
  });
});
