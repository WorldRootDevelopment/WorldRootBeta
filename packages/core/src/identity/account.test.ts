import { auditLog, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { docFromText } from '@worldroot/editor';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCharacter } from '../characters/service';
import { createManagedRole, assignRole, listMembers } from '../community/admin';
import { createCommunity, joinCommunity } from '../community/service';
import {
  acceptRequest,
  countUnreadConversations,
  declineRequest,
  getSpace,
  listConversations,
  listMessages,
  sendMessage,
  startConversation,
} from '../messaging/service';
import type { Actor } from '../platform/authorize';
import { createScene, inviteToScene } from '../scenes/service';
import { blockUser, changeHandle, getAccount, hasBlocked, listBlocked, unblockUser } from './account';
import { searchAccounts, setBadge, setPremium } from './badges';
import { createProfile, getProfile, getProfileByHandle } from './profile';

let connection: DbConnection;
let counter = 0;

const addUser = async (handle = `writer${(counter += 1)}`, staff = false): Promise<Actor> => {
  const [user] = await connection.db
    .insert(users)
    .values({ name: handle, email: `${handle}@example.com`, platformRole: staff ? 'staff' : 'user' })
    .returning();
  const actor: Actor = { userId: user!.id, platformRole: staff ? 'staff' : 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

beforeAll(async () => {
  connection = await createTestDb();
});

afterAll(async () => {
  await connection.close();
});

describe('badges', () => {
  it('are granted by staff only, shown in a fixed order, and recorded', async () => {
    const { db } = connection;
    const staff = await addUser('staffer', true);
    const writer = await addUser('badged');

    await expect(setBadge(db, writer, writer.userId, 'founder', true)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(setPremium(db, writer, writer.userId, true)).rejects.toMatchObject({ code: 'forbidden' });
    // Staff and Premium are derived from the account, so they cannot be handed out as loose badges.
    await expect(setBadge(db, staff, writer.userId, 'staff', true)).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(setBadge(db, staff, writer.userId, 'premium', true)).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(setBadge(db, staff, writer.userId, 'made_up', true)).rejects.toMatchObject({ code: 'invalid_input' });

    await setBadge(db, staff, writer.userId, 'beta_tester', true);
    await setBadge(db, staff, writer.userId, 'founder', true);
    await setBadge(db, staff, writer.userId, 'founder', true);
    await setPremium(db, staff, writer.userId, true);
    expect(await getProfile(db, writer.userId)).toMatchObject({ isStaff: false, badges: ['founder', 'premium', 'beta_tester'] });
    expect(await getProfile(db, staff.userId)).toMatchObject({ isStaff: true, badges: ['staff'] });

    await setBadge(db, staff, writer.userId, 'founder', false);
    await setPremium(db, staff, writer.userId, false);
    expect((await getProfile(db, writer.userId))!.badges).toEqual(['beta_tester']);

    const actions = (await db.select().from(auditLog).where(eq(auditLog.targetId, writer.userId))).map((row) => row.action);
    expect(actions.filter((action) => action.startsWith('platform.')).sort()).toEqual([
      'platform.badge.grant',
      'platform.badge.grant',
      'platform.badge.revoke',
      'platform.premium.grant',
      'platform.premium.revoke',
    ]);

    await expect(searchAccounts(db, writer, 'badged')).rejects.toMatchObject({ code: 'forbidden' });
    expect(await searchAccounts(db, staff, 'BADG')).toMatchObject([{ handle: 'badged', email: 'badged@example.com', badges: ['beta_tester'] }]);
    expect((await searchAccounts(db, staff, 'staffer@example')).map((row) => row.badges)).toEqual([['staff']]);
  });

  it('give each member one community badge, kept apart from platform badges', async () => {
    const { db } = connection;
    const owner = await addUser('cb_owner');
    const admin = await addUser('cb_admin');
    const mod = await addUser('cb_mod');
    const plain = await addUser('cb_plain');
    const staff = await addUser('cb_staff', true);
    const community = await createCommunity(db, owner, { slug: 'badge-valley', name: 'Badge Valley', listed: true });
    for (const person of [admin, mod, plain, staff]) await joinCommunity(db, person, community.id);
    const adminRole = await createManagedRole(db, owner, community.id, { name: 'Administrator', permissions: ['community.manage', 'post.remove'] });
    const modRole = await createManagedRole(db, owner, community.id, { name: 'Moderator', permissions: ['post.remove'] });
    const flair = await createManagedRole(db, owner, community.id, { name: 'World Builder', permissions: ['location.create'] });
    await assignRole(db, owner, adminRole.id, admin.userId);
    await assignRole(db, owner, modRole.id, mod.userId);
    await assignRole(db, owner, flair.id, plain.userId);

    const badges = Object.fromEntries((await listMembers(db, community.id)).map((m) => [m.handle, [m.communityBadge, m.badges]]));
    expect(badges).toEqual({
      cb_owner: ['owner', []],
      cb_admin: ['admin', []],
      cb_mod: ['moderator', []],
      // A role that moderates nothing earns no badge, and WorldRoot staff are not this community's admins.
      cb_plain: [null, []],
      cb_staff: [null, ['staff']],
    });

    const { conversation } = await getSpace(db, mod, community.id, 'lounge');
    await sendMessage(db, mod, conversation.id, 'Keep it friendly.');
    await sendMessage(db, staff, conversation.id, 'Hello from WorldRoot.');
    expect((await listMessages(db, plain, conversation.id)).messages.map((m) => [m.authorCommunityBadge, m.authorBadges])).toEqual([
      ['moderator', []],
      [null, ['staff']],
    ]);
  });
});

describe('changing your handle', () => {
  it('keeps the old one pointing at you, waits between changes, and refuses names in use', async () => {
    const { db } = connection;
    const thea = await addUser('thea');
    const other = await addUser('captain');

    await expect(changeHandle(db, thea, 'no spaces')).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(changeHandle(db, thea, 'Captain')).rejects.toMatchObject({ code: 'conflict', fields: { handle: 'That handle is taken.' } });

    // Changing only the capitals is free and starts no waiting period.
    expect(await changeHandle(db, thea, 'Thea')).toMatchObject({ handle: 'Thea' });
    expect((await getAccount(db, thea)).nextHandleChange).toBeNull();

    expect(await changeHandle(db, thea, 'thea_bunn')).toMatchObject({ handle: 'thea_bunn' });
    expect((await getProfileByHandle(db, 'THEA'))!.userId).toBe(thea.userId);
    expect((await getProfileByHandle(db, 'thea_bunn'))!.userId).toBe(thea.userId);
    // The old name is held for her, so nobody can take it and impersonate her.
    await expect(changeHandle(db, other, 'thea')).rejects.toMatchObject({ code: 'conflict' });

    await expect(changeHandle(db, thea, 'thea_again')).rejects.toMatchObject({ code: 'conflict' });
    expect((await getAccount(db, thea)).nextHandleChange!.getTime()).toBeGreaterThan(Date.now());

    // Staff are not held to the wait.
    const staff = await addUser('helper', true);
    await changeHandle(db, staff, 'helper_one');
    await expect(changeHandle(db, staff, 'helper_two')).resolves.toMatchObject({ handle: 'helper_two' });
    // And taking back your own old handle is allowed.
    await expect(changeHandle(db, staff, 'helper')).resolves.toMatchObject({ handle: 'helper' });
  });
});

describe('message requests', () => {
  it('hold a stranger’s first messages until the recipient answers', async () => {
    const { db } = connection;
    const asker = await addUser('asker');
    const target = await addUser('target');

    const request = await startConversation(db, asker, { handles: ['target'] });
    expect(request).toMatchObject({ requestState: 'pending', requestedByUserId: asker.userId });
    for (const text of ['Hi!', 'I liked your character.', 'Want to write?']) await sendMessage(db, asker, request.id, text);
    await expect(sendMessage(db, asker, request.id, 'Hello??')).rejects.toMatchObject({ code: 'conflict' });

    expect((await listConversations(db, target))[0]).toMatchObject({ request: 'incoming', unread: true });
    expect((await listConversations(db, asker))[0]).toMatchObject({ request: 'outgoing' });
    await expect(acceptRequest(db, asker, request.id)).rejects.toMatchObject({ code: 'conflict' });

    // Replying accepts it.
    await sendMessage(db, target, request.id, 'Sure, tell me more.');
    expect((await listConversations(db, target))[0]!.request).toBeNull();
    await expect(sendMessage(db, asker, request.id, 'Great!')).resolves.toBeTruthy();
  });

  it('can be accepted or declined outright, and a decline tells the sender nothing', async () => {
    const { db } = connection;
    const asker = await addUser();
    const yes = await addUser('says_yes');
    const no = await addUser('says_no');

    const first = await startConversation(db, asker, { handles: ['says_yes'] });
    await sendMessage(db, asker, first.id, 'Hello.');
    await acceptRequest(db, yes, first.id);
    expect((await listConversations(db, yes))[0]!.request).toBeNull();

    const second = await startConversation(db, asker, { handles: ['says_no'] });
    await sendMessage(db, asker, second.id, 'Hello.');
    expect(await countUnreadConversations(db, no.userId)).toBe(1);
    await declineRequest(db, no, second.id);
    expect(await listConversations(db, no)).toEqual([]);
    expect(await countUnreadConversations(db, no.userId)).toBe(0);
    // To the sender it still looks like an unanswered request, and further messages are refused like a block.
    expect((await listConversations(db, asker)).find((c) => c.id === second.id)).toBeTruthy();
    await expect(sendMessage(db, asker, second.id, 'Hello?')).rejects.toMatchObject({ code: 'forbidden', message: 'You cannot message this person.' });
  });

  it('are skipped between people who share a community, and groups are only for such people', async () => {
    const { db } = connection;
    const a = await addUser('neighbor_a');
    const b = await addUser('neighbor_b');
    const outsider = await addUser('outsider_c');
    const community = await createCommunity(db, a, { slug: 'neighbors', name: 'Neighbors', listed: true });
    await joinCommunity(db, b, community.id);

    expect((await startConversation(db, a, { handles: ['neighbor_b'] })).requestState).toBe('none');
    await expect(startConversation(db, a, { handles: ['neighbor_b', 'outsider_c'] })).rejects.toMatchObject({ code: 'forbidden' });
    await joinCommunity(db, outsider, community.id);
    await expect(startConversation(db, a, { handles: ['neighbor_b', 'outsider_c'] })).resolves.toMatchObject({ kind: 'group' });
  });
});

describe('blocking', () => {
  it('closes private contact both ways without telling the blocked person', async () => {
    const { db } = connection;
    const thea = await addUser('blocker');
    const pest = await addUser('pest');
    const community = await createCommunity(db, thea, { slug: 'block-valley', name: 'Block Valley', listed: true });
    await joinCommunity(db, pest, community.id);
    const chat = await startConversation(db, pest, { handles: ['blocker'] });
    await sendMessage(db, pest, chat.id, 'Hey.');

    await expect(blockUser(db, thea, thea.userId)).rejects.toMatchObject({ code: 'invalid_input' });
    await blockUser(db, thea, pest.userId);
    await blockUser(db, thea, pest.userId);
    expect(await listBlocked(db, thea)).toMatchObject([{ handle: 'pest' }]);
    expect([await hasBlocked(db, thea, pest.userId), await hasBlocked(db, pest, thea.userId)]).toEqual([true, false]);
    // The blocked person's own list shows nothing: they are not told.
    expect(await listBlocked(db, pest)).toEqual([]);

    // Neither can write in the existing conversation, and the wording does not say who blocked whom.
    await expect(sendMessage(db, pest, chat.id, 'Hello?')).rejects.toMatchObject({ code: 'forbidden', message: 'You cannot message this person.' });
    await expect(sendMessage(db, thea, chat.id, 'Stop.')).rejects.toMatchObject({ code: 'forbidden' });

    const stranger = await addUser('stranger_d');
    await blockUser(db, stranger, pest.userId);
    await expect(startConversation(db, pest, { handles: ['stranger_d'] })).rejects.toMatchObject({ code: 'forbidden' });
    await expect(startConversation(db, stranger, { handles: ['pest'] })).rejects.toMatchObject({ code: 'forbidden' });

    const character = await createCharacter(db, pest, { name: 'Persistent' });
    const scene = await createScene(db, pest, { title: 'Just us', rating: 'everyone', characterIds: [character.id], openingPost: docFromText('Hello.') });
    await expect(inviteToScene(db, pest, scene.id, 'blocker')).rejects.toMatchObject({ code: 'forbidden' });

    await unblockUser(db, thea, pest.userId);
    await expect(sendMessage(db, pest, chat.id, 'Sorry about before.')).resolves.toBeTruthy();
  });
});
