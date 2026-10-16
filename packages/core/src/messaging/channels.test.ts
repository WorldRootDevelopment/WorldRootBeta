import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assignRole } from '../community/admin';
import { createCommunity, createRole, joinCommunity } from '../community/service';
import { createProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { createChannel, deleteChannel, getChannel, listChannels, listChannelsForAdmin, moveChannel, updateChannel } from './channels';
import { getSpace, listMessages, markConversationRead, sendMessage } from './service';

let connection: DbConnection;
let owner: Actor;
let helper: Actor;
let member: Actor;
let visitor: Actor;
let communityId: string;
let helperRoleId: string;

const addUser = async (handle: string): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com` }).returning();
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

beforeAll(async () => {
  connection = await createTestDb();
  const { db } = connection;
  owner = await addUser('owner');
  helper = await addUser('helper');
  member = await addUser('member');
  visitor = await addUser('visitor');
  const community = await createCommunity(db, owner, { slug: 'harbour', name: 'Harbour Lights', listed: true });
  communityId = community.id;
  await joinCommunity(db, helper, communityId);
  await joinCommunity(db, member, communityId);
  const role = await createRole(db, owner, communityId, { name: 'Helper', position: 100, permissions: [] });
  helperRoleId = role.id;
  await assignRole(db, owner, role.id, helper.userId);
});

afterAll(async () => {
  await connection.close();
});

const names = async (actor: Actor) => (await listChannels(connection.db, actor, communityId)).map((channel) => channel.name);
const gone = { code: 'not_found' };

describe('chat channels', () => {
  it('start with the Lounge as the first channel, keeping what was said in it', async () => {
    const { db } = connection;
    // Said in the Lounge before channels existed.
    const lounge = await getSpace(db, member, communityId, 'lounge');
    await sendMessage(db, member, lounge.conversation.id, 'Hello from the old Lounge.');

    expect(await names(member)).toEqual(['lounge']);
    const { channel, access } = await getChannel(db, member, communityId, 'lounge');
    expect(channel.conversationId).toBe(lounge.conversation.id);
    expect(access.canPost).toBe(true);
    expect((await listMessages(db, member, channel.conversationId)).messages.map((message) => message.body)).toEqual(['Hello from the old Lounge.']);
  });

  it('are added, renamed and reordered by whoever manages the community, and nobody else', async () => {
    const { db } = connection;
    await expect(createChannel(db, member, communityId, { name: 'plotting' })).rejects.toMatchObject({ code: 'forbidden' });

    const plotting = await createChannel(db, owner, communityId, { name: ' Plotting Room ', topic: 'Plan scenes here.', category: 'Out Of Character' });
    expect(plotting).toMatchObject({ name: 'plotting-room', topic: 'Plan scenes here.', category: 'Out Of Character', readRoleIds: null, postRoleIds: null });
    await createChannel(db, owner, communityId, { name: 'art' });
    expect(await names(member)).toEqual(['lounge', 'plotting-room', 'art']);

    // Names are addresses: one of each, and nothing a link could not carry.
    await expect(createChannel(db, owner, communityId, { name: 'ART' })).rejects.toMatchObject({ code: 'conflict' });
    await expect(createChannel(db, owner, communityId, { name: 'no/slashes' })).rejects.toMatchObject({ code: 'invalid_input' });

    await updateChannel(db, owner, plotting.id, { name: 'plotting', topic: null, category: 'Out Of Character' });
    await moveChannel(db, owner, plotting.id, 'down');
    expect(await names(member)).toEqual(['lounge', 'art', 'plotting']);
    await moveChannel(db, owner, plotting.id, 'down');
    expect(await names(member)).toEqual(['lounge', 'art', 'plotting']);
    await expect(moveChannel(db, member, plotting.id, 'up')).rejects.toMatchObject({ code: 'forbidden' });

    // Each channel keeps its own messages.
    const { channel } = await getChannel(db, member, communityId, 'plotting');
    await sendMessage(db, member, channel.conversationId, 'Who wants the harbour scene?');
    expect((await listMessages(db, helper, channel.conversationId)).messages).toHaveLength(1);
    const lounge = await getChannel(db, member, communityId, 'lounge');
    expect((await listMessages(db, member, lounge.channel.conversationId)).messages).toHaveLength(1);
  });

  it('can be private to some roles, and then do not exist for anyone else', async () => {
    const { db } = connection;
    const staffRoom = await createChannel(db, owner, communityId, { name: 'helpers', readRoleIds: [helperRoleId] });
    // A role from nowhere would lock everyone out without saying so.
    await expect(createChannel(db, owner, communityId, { name: 'broken', readRoleIds: ['01900000-0000-7000-8000-000000000000'] })).rejects.toMatchObject({ code: 'invalid_input' });

    expect(await names(helper)).toContain('helpers');
    expect(await names(owner)).toContain('helpers');
    expect(await names(member)).not.toContain('helpers');
    expect(await names(visitor)).not.toContain('helpers');
    await expect(getChannel(db, member, communityId, 'helpers')).rejects.toMatchObject(gone);
    // Knowing its address does not help: reading and writing are refused the same way.
    await expect(listMessages(db, member, staffRoom.conversationId)).rejects.toMatchObject(gone);
    await expect(sendMessage(db, member, staffRoom.conversationId, 'Let me in.')).rejects.toMatchObject(gone);

    await sendMessage(db, helper, staffRoom.conversationId, 'Only we can see this.');
    expect((await listMessages(db, owner, staffRoom.conversationId)).messages).toHaveLength(1);
    expect((await listChannelsForAdmin(db, owner, communityId)).find((channel) => channel.name === 'helpers')?.readRoleIds).toEqual([helperRoleId]);
  });

  it('can be open to read while only some roles post', async () => {
    const { db } = connection;
    const news = await createChannel(db, owner, communityId, { name: 'news', postRoleIds: [helperRoleId] });
    expect((await getChannel(db, member, communityId, 'news')).access.canPost).toBe(false);
    expect((await getChannel(db, helper, communityId, 'news')).access.canPost).toBe(true);
    await expect(sendMessage(db, member, news.conversationId, 'Me too!')).rejects.toMatchObject({ code: 'forbidden' });
    await sendMessage(db, helper, news.conversationId, 'The spring event opens Friday.');
    expect((await listMessages(db, member, news.conversationId)).messages).toHaveLength(1);
    // Someone who has only looked in on a listed community can read, as in the Lounge, but not post.
    expect((await getChannel(db, visitor, communityId, 'news')).access.canPost).toBe(false);
    expect((await getChannel(db, visitor, communityId, 'lounge')).access.canPost).toBe(false);
  });

  it('show which have something new since you last read them', async () => {
    const { db } = connection;
    const unread = async (actor: Actor) => (await listChannels(db, actor, communityId)).filter((channel) => channel.unread).map((channel) => channel.name);
    const { channel } = await getChannel(db, member, communityId, 'art');
    await markConversationRead(db, member, channel.conversationId);
    expect(await unread(member)).not.toContain('art');
    await sendMessage(db, helper, channel.conversationId, 'New sketch!');
    expect(await unread(member)).toContain('art');
    await markConversationRead(db, member, channel.conversationId);
    expect(await unread(member)).not.toContain('art');
  });

  it('are deleted with their messages, but never the last one', async () => {
    const { db } = connection;
    const { channel } = await getChannel(db, owner, communityId, 'art');
    await expect(deleteChannel(db, member, channel.id)).rejects.toMatchObject({ code: 'forbidden' });
    await deleteChannel(db, owner, channel.id);
    expect(await names(member)).not.toContain('art');
    await expect(listMessages(db, member, channel.conversationId)).rejects.toMatchObject(gone);

    for (const name of ['plotting', 'helpers', 'news']) await deleteChannel(db, owner, (await getChannel(db, owner, communityId, name)).channel.id);
    const last = (await getChannel(db, owner, communityId, 'lounge')).channel;
    await expect(deleteChannel(db, owner, last.id)).rejects.toMatchObject({ code: 'conflict' });
    expect(await names(member)).toEqual(['lounge']);
  });
});
