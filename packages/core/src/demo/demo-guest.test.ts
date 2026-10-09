import { roleAssignments, roles, sessions, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getCommunityView } from '../community/service';
import { createAuth } from '../identity/auth';
import type { Actor } from '../platform/authorize';
import { createCharacter } from '../characters/service';
import { UNLIMITED_DEMO_EMAILS } from '../identity/plan';
import { DEMO_GUEST, ensureDemoGuest, isDemoGuest, lockDemoGuest } from './demo-guest';
import { DEMO_ACCOUNT, DEMO_COMMUNITY_SLUG, seedDemo } from './demo-town';
import { DND_DEMO_COMMUNITY_SLUG, seedDndDemo } from './dnd-demo';

let connection: DbConnection;

beforeAll(async () => {
  connection = await createTestDb();
  await seedDemo(connection.db);
  await seedDndDemo(connection.db);
});

afterAll(async () => {
  await connection.close();
});

describe('the shared guest account', () => {
  it('is an ordinary member of both demo communities, and owns neither', async () => {
    const { db } = connection;
    await ensureDemoGuest(db);
    await ensureDemoGuest(db);

    const [guest] = await db.select().from(users).where(eq(users.email, DEMO_GUEST.email));
    expect(guest).toMatchObject({ platformRole: 'user' });
    const actor: Actor = { userId: guest!.id, platformRole: 'user' };
    for (const slug of [DEMO_COMMUNITY_SLUG, DND_DEMO_COMMUNITY_SLUG]) {
      const view = await getCommunityView(db, actor, slug);
      expect(view.isMember).toBe(true);
    }
    const owned = await db
      .select({ id: roles.id })
      .from(roleAssignments)
      .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
      .where(and(eq(roleAssignments.userId, guest!.id), eq(roles.isOwner, true)));
    expect(owned).toHaveLength(0);
  });

  it('is not held to one person’s character limit, because everyone shares it', async () => {
    const { db } = connection;
    expect([...UNLIMITED_DEMO_EMAILS].sort()).toEqual([DEMO_ACCOUNT.email, DEMO_GUEST.email].sort());
    const [guest] = await db.select().from(users).where(eq(users.email, DEMO_GUEST.email));
    const actor: Actor = { userId: guest!.id, platformRole: 'user' };
    for (let index = 1; index <= 12; index += 1) await createCharacter(db, actor, { name: `Visitor ${index}` });
  });

  it('is recognized by its email and nothing else', () => {
    expect(isDemoGuest(' Guest@WorldRoot.test ')).toBe(true);
    expect(isDemoGuest('host@worldroot.test')).toBe(false);
  });

  it('can be closed, which signs everyone out, and opened again', async () => {
    const { db } = connection;
    const auth = createAuth({ db, secret: 'dev-only-secret-change-me', baseURL: 'http://localhost:3000' });
    const signIn = () =>
      auth.api.signInEmail({ body: { email: DEMO_GUEST.email, password: DEMO_GUEST.password } }).then(
        () => true,
        () => false,
      );
    const [guest] = await db.select().from(users).where(eq(users.email, DEMO_GUEST.email));

    expect(await signIn()).toBe(true);
    await lockDemoGuest(db);
    expect(await signIn()).toBe(false);
    expect(await db.select().from(sessions).where(eq(sessions.userId, guest!.id))).toHaveLength(0);

    await ensureDemoGuest(db);
    expect(await signIn()).toBe(true);
  });
});
