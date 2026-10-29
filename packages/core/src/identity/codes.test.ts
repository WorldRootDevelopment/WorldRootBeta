import { redeemCodes, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Actor } from '../platform/authorize';
import { createCodeBatch, listCodeBatches, redeemCode } from './codes';
import { hasPremium } from './plan';
import { createProfile, getProfile } from './profile';

let connection: DbConnection;
let backer: Actor;
let other: Actor;
let staff: Actor;

const addUser = async (handle: string, platformRole: Actor['platformRole'] = 'user'): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com`, platformRole }).returning();
  const actor: Actor = { userId: user!.id, platformRole };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

beforeAll(async () => {
  connection = await createTestDb();
  backer = await addUser('backer');
  other = await addUser('other');
  staff = await addUser('warden', 'staff');
});

afterAll(async () => {
  await connection.close();
});

describe('backer codes', () => {
  it('are made by staff, one per line, and kept only as hashes', async () => {
    const { db } = connection;
    const input = { batch: 'Kickstarter 2026', references: '#101\n\n  #102 \n#103', grantsHeartwood: true, grantsBadge: 'kickstarter' };
    await expect(createCodeBatch(db, backer, input)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(createCodeBatch(db, staff, { ...input, grantsHeartwood: false, grantsBadge: null })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(createCodeBatch(db, staff, { ...input, grantsBadge: 'staff' })).rejects.toMatchObject({ code: 'invalid_input' });

    const codes = await createCodeBatch(db, staff, input);
    expect(codes.map((row) => row.reference)).toEqual(['#101', '#102', '#103']);
    for (const { code } of codes) expect(code).toMatch(/^WR-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    expect(new Set(codes.map((row) => row.code)).size).toBe(3);

    const stored = await db.select().from(redeemCodes);
    expect(stored.some((row) => codes.some(({ code }) => row.codeHash.includes(code.replace(/-/g, '')) || row.codeHash === code))).toBe(false);
    expect(await listCodeBatches(db, staff)).toMatchObject([{ batch: 'Kickstarter 2026', total: 3, redeemed: 0, grantsHeartwood: true, grantsBadge: 'kickstarter' }]);
  });

  it('give Heartwood and the badge once, to whoever enters them first, however they are typed', async () => {
    const { db } = connection;
    const [first, second] = await createCodeBatch(db, staff, { batch: 'Kickstarter: Late Pledges', references: 'a\nb', grantsHeartwood: true, grantsBadge: 'kickstarter' });
    const refused = { code: 'not_found' };

    await expect(redeemCode(db, backer, 'WR-AAAA-AAAA-AAAA')).rejects.toMatchObject(refused);
    await expect(redeemCode(db, backer, 'nonsense')).rejects.toMatchObject(refused);
    expect(await hasPremium(db, backer)).toBe(false);

    // Lower case, spaces and no prefix all work.
    const typed = ` ${first!.code.slice(3).toLowerCase().replace(/-/g, ' ')} `;
    expect(await redeemCode(db, backer, typed)).toEqual({ heartwood: true, months: null, badge: 'kickstarter' });
    expect(await hasPremium(db, backer)).toBe(true);
    expect((await getProfile(db, backer.userId))?.badges).toEqual(expect.arrayContaining(['premium', 'kickstarter']));

    // Used: refused for anyone, the same way as a code that never existed.
    await expect(redeemCode(db, other, first!.code)).rejects.toMatchObject(refused);
    await expect(redeemCode(db, backer, first!.code)).rejects.toMatchObject(refused);

    // A second code on an account that already has both changes nothing but is still used up.
    expect(await redeemCode(db, backer, second!.code)).toEqual({ heartwood: true, months: null, badge: 'kickstarter' });
    expect((await listCodeBatches(db, staff)).find((batch) => batch.batch === 'Kickstarter: Late Pledges')).toMatchObject({ total: 2, redeemed: 2 });
  });
});
