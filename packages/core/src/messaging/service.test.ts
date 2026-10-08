import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createManagedRole, assignRole, listAuditLog } from '../community/admin';
import { createCommunity, joinCommunity, type Community } from '../community/service';
import { createProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import {
  canAccessConversation,
  countUnreadConversations,
  getSpace,
  listConversations,
  listMessages,
  markConversationRead,
  removeMessage,
  sendMessage,
  startConversation,
} from './service';

let connection: DbConnection;
let thea: Actor;
let marcus: Actor;
let sarah: Actor;

const addUser = async (handle: string): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com` }).returning();
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

beforeAll(async () => {
  connection = await createTestDb();
  thea = await addUser('thea');
  marcus = await addUser('marcus');
  sarah = await addUser('sarah');
});

afterAll(async () => {
  await connection.close();
});

describe('direct and group conversations', () => {
  it('give each pair one conversation, track unread, and stay private', async () => {
    const { db } = connection;
    const direct = await startConversation(db, thea, { handles: ['@Marcus'] });
    expect(direct.kind).toBe('direct');
    // Starting it again from either side finds the same one.
    expect((await startConversation(db, marcus, { handles: ['thea'] })).id).toBe(direct.id);

    await expect(startConversation(db, thea, { handles: ['thea'] })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(startConversation(db, thea, { handles: ['nobody'] })).rejects.toMatchObject({ code: 'not_found' });
    await expect(startConversation(db, thea, { handles: [] })).rejects.toMatchObject({ code: 'invalid_input' });

    await sendMessage(db, thea, direct.id, '  Want to start a scene?\r\nI have an idea.  ');
    await expect(sendMessage(db, thea, direct.id, '   ')).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(sendMessage(db, thea, direct.id, 'x'.repeat(4_001))).rejects.toMatchObject({ code: 'invalid_input' });

    expect(await countUnreadConversations(db, marcus.userId)).toBe(1);
    expect(await countUnreadConversations(db, thea.userId)).toBe(0);
    const [forMarcus] = await listConversations(db, marcus);
    expect(forMarcus).toMatchObject({
      kind: 'direct',
      title: 'thea',
      unread: true,
      lastMessage: { body: 'Want to start a scene?\nI have an idea.', mine: false },
    });

    await markConversationRead(db, marcus, direct.id);
    expect(await countUnreadConversations(db, marcus.userId)).toBe(0);
    await sendMessage(db, marcus, direct.id, 'Yes!');
    expect(await countUnreadConversations(db, thea.userId)).toBe(1);

    // A third person cannot read, write or follow it.
    await expect(listMessages(db, sarah, direct.id)).rejects.toMatchObject({ code: 'not_found' });
    await expect(sendMessage(db, sarah, direct.id, 'Hello?')).rejects.toMatchObject({ code: 'not_found' });
    expect(await canAccessConversation(db, sarah, direct.id)).toBe(false);
    expect(await canAccessConversation(db, marcus, direct.id)).toBe(true);
    expect(await listConversations(db, sarah)).toEqual([]);
  });

  it('support small groups, and removing your own message', async () => {
    const { db } = connection;
    const group = await startConversation(db, thea, { handles: ['marcus', 'sarah'], title: 'Late Train planning' });
    expect(group.kind).toBe('group');
    const sent = await sendMessage(db, sarah, group.id, 'Count me in.');

    const [forThea] = await listConversations(db, thea);
    expect(forThea).toMatchObject({ title: 'Late Train planning', kind: 'group' });
    expect(forThea!.people.map((person) => person.handle).sort()).toEqual(['marcus', 'sarah']);

    await expect(removeMessage(db, thea, sent.id)).rejects.toMatchObject({ code: 'forbidden' });
    await removeMessage(db, sarah, sent.id);
    const page = await listMessages(db, thea, group.id);
    expect(page.messages).toMatchObject([{ body: '', removedBy: 'author', mine: false }]);
    expect((await listConversations(db, thea))[0]!.lastMessage!.body).toBe('Message removed');

    const crowd = Array.from({ length: 12 }, (_, index) => `extra${index}`);
    for (const handle of crowd) await addUser(handle);
    await expect(startConversation(db, thea, { handles: crowd })).rejects.toMatchObject({ code: 'invalid_input' });
  });
});

describe('community spaces', () => {
  let community: Community;

  beforeAll(async () => {
    community = await createCommunity(connection.db, thea, { slug: 'bunn-valley', name: 'Bunn Valley', listed: true });
    await joinCommunity(connection.db, marcus, community.id);
  });

  it('let members talk in the Lounge, and only announcers post Announcements', async () => {
    const { db } = connection;
    const lounge = await getSpace(db, marcus, community.id, 'lounge');
    const news = await getSpace(db, marcus, community.id, 'announcements');
    expect(lounge.conversation.id).not.toBe(news.conversation.id);
    expect((await getSpace(db, thea, community.id, 'lounge')).conversation.id).toBe(lounge.conversation.id);
    expect([lounge.canPost, news.canPost]).toEqual([true, false]);

    await sendMessage(db, marcus, lounge.conversation.id, 'Hello, valley.');
    await expect(sendMessage(db, marcus, news.conversation.id, 'I declare a holiday.')).rejects.toMatchObject({
      code: 'forbidden',
      permission: 'announcement.post',
    });
    await sendMessage(db, thea, news.conversation.id, 'The first world opens on Friday.');

    // A listed community's spaces can be read by a non-member, who cannot post until they join.
    const visitor = await getSpace(db, sarah, community.id, 'lounge');
    expect(visitor.canPost).toBe(false);
    expect((await listMessages(db, sarah, lounge.conversation.id)).messages.map((m) => m.body)).toEqual(['Hello, valley.']);
    await expect(sendMessage(db, sarah, lounge.conversation.id, 'Drive-by.')).rejects.toMatchObject({ code: 'forbidden', permission: 'lounge.post' });

    // Community spaces do not clutter the Inbox.
    expect((await listConversations(db, marcus)).every((conversation) => conversation.kind !== ('community' as string))).toBe(true);
  });

  it('let a moderator remove a message, and record it', async () => {
    const { db } = connection;
    const { conversation } = await getSpace(db, marcus, community.id, 'lounge');
    const rude = await sendMessage(db, marcus, conversation.id, 'Something rude.');
    await joinCommunity(db, sarah, community.id);
    await expect(removeMessage(db, sarah, rude.id)).rejects.toMatchObject({ code: 'forbidden', permission: 'message.remove' });

    const moderator = await createManagedRole(db, thea, community.id, { name: 'Moderator', permissions: ['message.remove'] });
    await assignRole(db, thea, moderator.id, sarah.userId);
    await removeMessage(db, sarah, rude.id);

    const page = await listMessages(db, marcus, conversation.id);
    expect(page.messages.at(-1)).toMatchObject({ removedBy: 'moderator', body: '', mine: true });
    expect((await listAuditLog(db, thea, community.id)).map((row) => row.action)).toContain('message.remove');
  });

  it('are hidden with an unlisted community', async () => {
    const { db } = connection;
    const hidden = await createCommunity(db, thea, { slug: 'hidden', name: 'Hidden', listed: false });
    const { conversation } = await getSpace(db, thea, hidden.id, 'lounge');
    await expect(getSpace(db, marcus, hidden.id, 'lounge')).rejects.toMatchObject({ code: 'not_found' });
    await expect(listMessages(db, marcus, conversation.id)).rejects.toMatchObject({ code: 'not_found' });
  });
});
