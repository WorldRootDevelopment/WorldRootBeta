import { accounts, auditLog, communities, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listMembers } from '../community/admin';
import { listMemberPresence } from '../community/presence';
import { getCommunityView, listMyCommunities } from '../community/service';
import { DEMO_ACCOUNT, DEMO_COMMUNITY_SLUG, grantDemoAccess, seedDemo } from '../demo/demo-town';
import { getSpace, listMessages, sendMessage } from '../messaging/service';
import { docFromText } from '@worldroot/editor';
import { createCharacter } from '../characters/service';
import type { Actor } from '../platform/authorize';
import { createPost, createScene, getSceneView, inviteToScene, joinScene, listPosts } from '../scenes/service';
import { createAuth } from './auth';
import { createProfile, getProfile } from './profile';
import { ensurePlatformAdmin } from './staff';

let connection: DbConnection;

beforeAll(async () => {
  connection = await createTestDb();
  await seedDemo(connection.db);
});

afterAll(async () => {
  await connection.close();
});

describe('the platform administrator', () => {
  it('is created from configuration when the account does not exist, and made staff', async () => {
    const { db } = connection;
    // No account and no password: nothing to do.
    expect(await ensurePlatformAdmin(db, { email: 'admin@example.com' })).toBeNull();
    expect(await ensurePlatformAdmin(db, { email: '  ' })).toBeNull();

    const result = await ensurePlatformAdmin(db, { email: ' Admin@Example.com ', password: 'a-long-test-password' });
    expect(result).toMatchObject({ created: true, promoted: true });

    const [user] = await db.select().from(users).where(eq(users.email, 'admin@example.com'));
    expect(user).toMatchObject({ id: result!.userId, platformRole: 'staff' });
    // The password is stored hashed by the auth library, never as given.
    const [credential] = await db.select().from(accounts).where(eq(accounts.userId, user!.id));
    expect(credential!.password).toBeTruthy();
    expect(credential!.password).not.toContain('a-long-test-password');

    const [entry] = await db.select().from(auditLog).where(eq(auditLog.action, 'platform.staff.grant'));
    expect(entry).toMatchObject({ targetId: user!.id, actorUserId: null });

    // Running again changes nothing and writes no second record.
    expect(await ensurePlatformAdmin(db, { email: 'admin@example.com', password: 'a-different-password' })).toMatchObject({
      created: false,
      promoted: false,
    });
    const [after] = await db.select().from(accounts).where(eq(accounts.userId, user!.id));
    expect(after!.password).toBe(credential!.password);
    expect(await db.select().from(auditLog).where(eq(auditLog.action, 'platform.staff.grant'))).toHaveLength(1);
  });

  it('promotes an account that already exists without touching its password', async () => {
    const { db } = connection;
    const [existing] = await db.insert(users).values({ name: 'thea', email: 'thea@example.com' }).returning();
    const result = await ensurePlatformAdmin(db, { email: 'thea@example.com', password: 'ignored-for-existing-accounts' });
    expect(result).toMatchObject({ userId: existing!.id, created: false, promoted: true });
    expect(await db.select().from(accounts).where(eq(accounts.userId, existing!.id))).toEqual([]);
  });

  it('applies the configured password to an existing account only when asked to', async () => {
    const { db } = connection;
    const auth = createAuth({ db, secret: 'dev-only-secret-change-me', baseURL: 'http://localhost:3000' });
    const signIn = (password: string) =>
      auth.api.signInEmail({ body: { email: 'early@example.com', password } }).then(
        () => true,
        () => false,
      );

    // Someone who signed up long before being made an administrator, with a password of their own.
    await auth.api.signUpEmail({ body: { email: 'early@example.com', password: 'their-original-password', name: 'early' } });

    const plain = await ensurePlatformAdmin(db, { email: 'early@example.com', password: 'the-configured-password' });
    expect(plain).toMatchObject({ created: false, promoted: true, passwordSet: false });
    expect([await signIn('their-original-password'), await signIn('the-configured-password')]).toEqual([true, false]);

    const synced = await ensurePlatformAdmin(db, { email: 'early@example.com', password: 'the-configured-password', syncPassword: true });
    expect(synced).toMatchObject({ created: false, promoted: false, passwordSet: true });
    expect([await signIn('their-original-password'), await signIn('the-configured-password')]).toEqual([false, true]);
    expect(await db.select().from(auditLog).where(eq(auditLog.action, 'platform.staff.password_set'))).toHaveLength(1);

    // Once it matches, later starts change nothing and record nothing more.
    expect(await ensurePlatformAdmin(db, { email: 'early@example.com', password: 'the-configured-password', syncPassword: true })).toMatchObject({
      passwordSet: false,
    });
    expect(await db.select().from(auditLog).where(eq(auditLog.action, 'platform.staff.password_set'))).toHaveLength(1);

    // It is applied once. A password the person later chooses in the app is not overwritten by the settings file.
    await auth.api.signUpEmail({ body: { email: 'chooser@example.com', password: 'first-own-password', name: 'chooser' } });
    const chooser = (password: string) =>
      auth.api.signInEmail({ body: { email: 'chooser@example.com', password } }).then(
        () => true,
        () => false,
      );
    await ensurePlatformAdmin(db, { email: 'chooser@example.com', password: 'from-the-settings-file', syncPassword: true });
    expect(await chooser('from-the-settings-file')).toBe(true);
    expect(await ensurePlatformAdmin(db, { email: 'chooser@example.com', password: 'a-newer-settings-value', syncPassword: true })).toMatchObject({
      passwordSet: false,
    });
    expect([await chooser('from-the-settings-file'), await chooser('a-newer-settings-value')]).toEqual([true, false]);
  });

  it('carries a staff badge wherever their name is shown, and other people do not', async () => {
    const { db } = connection;
    const admin = await ensurePlatformAdmin(db, { email: 'badge@example.com', password: 'a-long-test-password' });
    const staff: Actor = { userId: admin!.userId, platformRole: 'staff' };
    await createProfile(db, staff, { handle: 'thea_admin', displayName: 'Thea', adultConfirmed: true });
    expect(await getProfile(db, staff.userId)).toMatchObject({ handle: 'thea_admin', isStaff: true });

    const [host] = await db.select().from(users).where(eq(users.email, DEMO_ACCOUNT.email));
    expect(await getProfile(db, host!.id)).toMatchObject({ isStaff: false });

    // Before being given the demo, staff can already see it but it is not among their communities.
    expect((await getCommunityView(db, staff, DEMO_COMMUNITY_SLUG)).isMember).toBe(false);
    expect(await listMyCommunities(db, staff.userId)).toEqual([]);

    await grantDemoAccess(db, staff.userId);
    await grantDemoAccess(db, staff.userId);
    const view = await getCommunityView(db, staff, DEMO_COMMUNITY_SLUG);
    expect(view).toMatchObject({ isMember: true, isOwner: true, memberCount: 2 });
    expect((await listMyCommunities(db, staff.userId)).map((c) => c.slug)).toEqual([DEMO_COMMUNITY_SLUG]);

    const members = await listMembers(db, view.community.id);
    const me = members.find((member) => member.handle === 'thea_admin')!;
    expect(me).toMatchObject({ badges: ['staff'], communityBadge: 'owner' });
    expect(me.roles.map((role) => role.name).sort()).toEqual(['Member', 'Owner']);
    expect(members.find((member) => member.handle === DEMO_ACCOUNT.handle)).toMatchObject({ badges: [], communityBadge: 'owner' });
    expect((await listMemberPresence(db, view.community.id)).find((row) => row.handle === 'thea_admin')!.badges).toEqual(['staff']);

    const { conversation } = await getSpace(db, staff, view.community.id, 'announcements');
    await sendMessage(db, staff, conversation.id, 'Welcome to Demo Town.');
    const hostActor: Actor = { userId: host!.id, platformRole: 'user' };
    await sendMessage(db, hostActor, conversation.id, 'Glad to be here.');
    const page = await listMessages(db, hostActor, conversation.id);
    expect(page.messages.map((message) => [message.authorHandle, message.authorBadges, message.authorCommunityBadge])).toEqual([
      ['thea_admin', ['staff'], 'owner'],
      [DEMO_ACCOUNT.handle, [], 'owner'],
    ]);

    // The same holds in scenes: on each post's byline and in the list of writers.
    const mine = await createCharacter(db, staff, { name: 'Mayor Thea' });
    const theirs = await createCharacter(db, hostActor, { name: 'A Townsperson' });
    const scene = await createScene(db, staff, {
      title: 'A Word From the Mayor',
      rating: 'everyone',
      characterIds: [mine.id],
      openingPost: docFromText('The mayor cleared her throat.'),
    });
    await inviteToScene(db, staff, scene.id, DEMO_ACCOUNT.handle);
    await joinScene(db, hostActor, scene.id, [theirs.id]);
    await createPost(db, hostActor, scene.id, { kind: 'ic', characterId: theirs.id, content: docFromText('Somebody coughed.') });
    const story = await listPosts(db, hostActor, scene.id, { stream: 'story' });
    expect(story.posts.map((post) => [post.authorHandle, post.authorBadges])).toEqual([
      ['thea_admin', ['staff']],
      [DEMO_ACCOUNT.handle, []],
    ]);
    const { participants } = await getSceneView(db, hostActor, scene.id);
    expect(participants.map((person) => [person.handle, person.badges])).toEqual([
      ['thea_admin', ['staff']],
      [DEMO_ACCOUNT.handle, []],
    ]);
  });
});

describe('the demo accounts', () => {
  it('leave exactly one demo account, owning only the demo community', async () => {
    const { db } = connection;
    expect(await db.select().from(users).where(eq(users.email, 'demo@worldroot.test'))).toEqual([]);
    const [host] = await db.select().from(users).where(eq(users.email, DEMO_ACCOUNT.email));
    const mine = await listMyCommunities(db, host!.id);
    expect(mine.map((community) => community.slug)).toEqual([DEMO_COMMUNITY_SLUG]);
    expect((await db.select().from(communities)).filter((community) => community.slug === 'meridian')).toEqual([]);
  });
});
