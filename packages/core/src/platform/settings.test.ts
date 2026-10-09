import { auditLog, platformSettings, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Actor } from './authorize';
import { getSeason, setSeason } from './settings';

let connection: DbConnection;

beforeAll(async () => {
  connection = await createTestDb();
});

afterAll(async () => {
  await connection.close();
});

describe('the site look', () => {
  it('is standard until staff change it, and only staff can', async () => {
    const { db } = connection;
    const [a, b] = await db
      .insert(users)
      .values([
        { name: 'staffer', email: 'staffer@example.com', platformRole: 'staff' },
        { name: 'member', email: 'member@example.com' },
      ])
      .returning();
    const staff: Actor = { userId: a!.id, platformRole: 'staff' };
    const member: Actor = { userId: b!.id, platformRole: 'user' };

    expect(await getSeason(db)).toBe('none');
    await expect(setSeason(db, member, 'pride')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(setSeason(db, staff, 'carnival')).rejects.toMatchObject({ code: 'invalid_input' });
    expect(await getSeason(db)).toBe('none');

    expect(await setSeason(db, staff, 'pride')).toBe('pride');
    expect(await getSeason(db)).toBe('pride');
    await setSeason(db, staff, 'pride');
    await setSeason(db, staff, 'trans');
    await setSeason(db, staff, 'none');
    expect(await getSeason(db)).toBe('none');
    // Each real change is recorded; setting the same look twice is not.
    expect(await db.select().from(auditLog).where(eq(auditLog.action, 'platform.season.set'))).toHaveLength(3);

    // A value this version does not know is treated as the standard look, not an error.
    await db.update(platformSettings).set({ value: 'from-the-future' }).where(eq(platformSettings.key, 'season'));
    expect(await getSeason(db)).toBe('none');
  });
});
