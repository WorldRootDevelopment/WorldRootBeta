import { seasonForDate } from '@worldroot/contracts';
import { auditLog, platformSettings, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Actor } from './authorize';
import { getSeason, getSeasonMode, setSeason } from './settings';

let connection: DbConnection;
const on = (month: number, day: number, year = 2027) => new Date(Date.UTC(year, month - 1, day, 12));

beforeAll(async () => {
  connection = await createTestDb();
});

afterAll(async () => {
  await connection.close();
});

describe('the calendar of site looks', () => {
  it('turns each look on for its days and leaves the rest of the year plain', () => {
    const cases: Array<[number, number, string]> = [
      [1, 15, 'winter'],
      [2, 28, 'winter'],
      [3, 1, 'spring'],
      [3, 30, 'spring'],
      // One day of observance sits inside spring.
      [3, 31, 'trans'],
      [4, 1, 'spring'],
      [5, 31, 'spring'],
      [6, 1, 'pride'],
      [6, 30, 'pride'],
      [7, 1, 'none'],
      [9, 30, 'none'],
      [10, 1, 'halloween'],
      [10, 31, 'halloween'],
      [11, 1, 'none'],
      [11, 13, 'trans'],
      [11, 20, 'trans'],
      [11, 21, 'none'],
      [12, 1, 'winter'],
      [12, 31, 'winter'],
    ];
    for (const [month, day, look] of cases) expect(seasonForDate(on(month, day)), `${month}/${day}`).toBe(look);
    // The last day of February in a leap year is still winter.
    expect(seasonForDate(on(2, 29, 2028))).toBe('winter');
  });
});

describe('the site look', () => {
  it('follows the calendar until staff hold one on, and only staff can', async () => {
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

    // With nothing chosen, the calendar decides.
    expect(await getSeasonMode(db)).toBe('auto');
    expect(await getSeason(db, on(10, 20))).toBe('halloween');
    expect(await getSeason(db, on(8, 5))).toBe('none');

    await expect(setSeason(db, member, 'pride')).rejects.toMatchObject({ code: 'forbidden' });
    await expect(setSeason(db, staff, 'carnival')).rejects.toMatchObject({ code: 'invalid_input' });
    expect(await getSeasonMode(db)).toBe('auto');

    // A look held on stays on whatever the date.
    expect(await setSeason(db, staff, 'pride')).toBe('pride');
    expect(await getSeason(db, on(10, 20))).toBe('pride');
    await setSeason(db, staff, 'pride');
    // Standard held on means no look at all, even in October.
    await setSeason(db, staff, 'none');
    expect(await getSeason(db, on(10, 20))).toBe('none');
    // Back to the calendar.
    expect(await setSeason(db, staff, 'auto')).toBe('auto');
    expect(await getSeason(db, on(6, 10))).toBe('pride');
    // Each real change is recorded; choosing the same thing twice is not.
    expect(await db.select().from(auditLog).where(eq(auditLog.action, 'platform.season.set'))).toHaveLength(3);

    // A value this version does not know is treated as following the calendar, not an error.
    await db.update(platformSettings).set({ value: 'holidays' }).where(eq(platformSettings.key, 'season'));
    expect(await getSeasonMode(db)).toBe('auto');
    expect(await getSeason(db, on(1, 2))).toBe('winter');
  });
});
