import { auditLog, outboxEvents, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Actor } from '../platform/authorize';
import { processOutbox } from '../platform/outbox';
import { createProfile, getProfileByHandle } from './profile';

let connection: DbConnection;

const addUser = async (email: string): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: 'Test', email }).returning();
  return { userId: user!.id, platformRole: 'user' };
};

const input = { handle: 'TheaBunn', displayName: 'Thea', adultConfirmed: true as const };

beforeAll(async () => {
  connection = await createTestDb();
});

afterAll(async () => {
  await connection.close();
});

describe('createProfile', () => {
  it('creates the profile, an audit entry and an outbox event together', async () => {
    const actor = await addUser('thea@example.com');
    const profile = await createProfile(connection.db, actor, input);

    expect(profile).toMatchObject({ userId: actor.userId, handle: 'TheaBunn', displayName: 'Thea' });

    const audit = await connection.db.select().from(auditLog);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ action: 'profile.create', actorUserId: actor.userId });

    const events = await connection.db.select().from(outboxEvents);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'user.onboarded', payload: { userId: actor.userId }, processedAt: null });
  });

  it('treats handles as case-insensitive', async () => {
    const actor = await addUser('second@example.com');
    await expect(createProfile(connection.db, actor, { ...input, handle: 'theabunn' })).rejects.toMatchObject({
      code: 'conflict',
      fields: { handle: 'That handle is taken.' },
    });
    expect(await getProfileByHandle(connection.db, 'THEABUNN')).not.toBeNull();
  });

  it('refuses a second profile for the same account', async () => {
    const actor = await addUser('third@example.com');
    await createProfile(connection.db, actor, { ...input, handle: 'captain_thea' });
    await expect(createProfile(connection.db, actor, { ...input, handle: 'another' })).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  it('refuses without the adult confirmation and reports the field', async () => {
    const actor = await addUser('fourth@example.com');
    const bad = { ...input, handle: 'sarah', adultConfirmed: false } as unknown as typeof input;
    await expect(createProfile(connection.db, actor, bad)).rejects.toMatchObject({
      code: 'invalid_input',
      fields: { adultConfirmed: expect.any(String) },
    });
  });
});

describe('outbox', () => {
  it('delivers pending events once, and retries a failing handler without losing the event', async () => {
    const seen: string[] = [];
    const first = await processOutbox(connection.db, {
      'user.onboarded': [async (event) => void seen.push(event.payload.userId)],
    });
    expect(first.processed).toBeGreaterThan(0);
    expect(seen).toHaveLength(first.processed);

    const again = await processOutbox(connection.db, {
      'user.onboarded': [async () => void seen.push('twice')],
    });
    expect(again).toEqual({ processed: 0, failed: 0 });

    const actor = await addUser('fifth@example.com');
    await createProfile(connection.db, actor, { ...input, handle: 'marcus' });

    const failing = await processOutbox(connection.db, {
      'user.onboarded': [
        async () => {
          throw new Error('consumer down');
        },
      ],
    });
    expect(failing).toEqual({ processed: 0, failed: 1 });

    const retried = await processOutbox(connection.db, { 'user.onboarded': [async () => {}] });
    expect(retried).toEqual({ processed: 1, failed: 0 });
  });
});
