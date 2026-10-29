import { notifications, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assignRole } from '../community/admin';
import { createCommunity, createRole, joinCommunity } from '../community/service';
import { createProfile } from '../identity/profile';
import { updateProfile } from '../identity/profile-view';
import type { Actor } from '../platform/authorize';
import { createChannel, getChannel } from './channels';
import { listMessages, removeMessage, sendMessage, toggleReaction } from './service';

let connection: DbConnection;
let thea: Actor;
let marcus: Actor;
let quiet: Actor;
let outsider: Actor;
let communityId: string;
let lounge: string;

const addUser = async (handle: string): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com` }).returning();
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

const told = async (actor: Actor, type: string) =>
  (await connection.db.select().from(notifications).where(and(eq(notifications.userId, actor.userId), eq(notifications.type, type)))).length;

beforeAll(async () => {
  connection = await createTestDb();
  const { db } = connection;
  thea = await addUser('thea');
  marcus = await addUser('marcus');
  quiet = await addUser('quiet');
  outsider = await addUser('outsider');
  const community = await createCommunity(db, thea, { slug: 'harbour', name: 'Harbour Lights', listed: true });
  communityId = community.id;
  await joinCommunity(db, marcus, communityId);
  await joinCommunity(db, quiet, communityId);
  lounge = (await getChannel(db, thea, communityId, 'lounge')).channel.conversationId;
});

afterAll(async () => {
  await connection.close();
});

describe('chat replies, reactions and mentions', () => {
  it('replies quote what they answer, and still say so when it is removed', async () => {
    const { db } = connection;
    const question = await sendMessage(db, marcus, lounge, 'Anyone up for the harbour scene tonight?');
    const answer = await sendMessage(db, thea, lounge, 'Yes! Give me an hour.', question.id);
    expect(await told(marcus, 'message.reply')).toBe(1);

    const shown = (await listMessages(db, thea, lounge)).messages.find((message) => message.id === answer.id);
    expect(shown?.replyTo).toMatchObject({ id: question.id, authorName: 'marcus', removed: false });
    expect(shown?.replyTo?.excerpt).toContain('harbour scene');

    // Only a message in the same conversation, and not one that is gone.
    const other = await createChannel(db, thea, communityId, { name: 'art' });
    await expect(sendMessage(db, thea, other.conversationId, 'Wrong room.', question.id)).rejects.toMatchObject({ code: 'invalid_input' });
    await removeMessage(db, marcus, question.id);
    await expect(sendMessage(db, thea, lounge, 'Too late.', question.id)).rejects.toMatchObject({ code: 'invalid_input' });
    expect((await listMessages(db, thea, lounge)).messages.find((message) => message.id === answer.id)?.replyTo).toMatchObject({ removed: true, excerpt: '' });
  });

  it('reactions are a fixed set, one of each per person, and counted', async () => {
    const { db } = connection;
    const news = await sendMessage(db, thea, lounge, 'The event starts Friday.');
    expect(await toggleReaction(db, marcus, news.id, '🎉')).toMatchObject({ added: true });
    await toggleReaction(db, quiet, news.id, '🎉');
    await toggleReaction(db, marcus, news.id, '👍');
    await expect(toggleReaction(db, marcus, news.id, '🍕')).rejects.toMatchObject({ code: 'invalid_input' });
    // A visitor who has only looked in on a listed community can read but not react.
    await expect(toggleReaction(db, outsider, news.id, '👍')).rejects.toMatchObject({ code: 'forbidden' });

    const seen = async (actor: Actor) => (await listMessages(db, actor, lounge)).messages.find((message) => message.id === news.id)!.reactions;
    expect(await seen(marcus)).toEqual([
      { emoji: '👍', count: 1, mine: true },
      { emoji: '🎉', count: 2, mine: true },
    ]);
    expect(await toggleReaction(db, marcus, news.id, '🎉')).toMatchObject({ added: false });
    expect(await seen(thea)).toEqual([
      { emoji: '👍', count: 1, mine: false },
      { emoji: '🎉', count: 1, mine: false },
    ]);
  });

  it('mentions notify members who can read the channel, unless they asked not to be pinged', async () => {
    const { db } = connection;
    await updateProfile(db, quiet, { displayName: 'quiet', hideOnline: false, playerRoles: ['pings:no'] });
    await sendMessage(db, thea, lounge, 'Thanks @Marcus and @quiet, and hi @outsider and @nobody_here! Also @thea.');
    expect(await told(marcus, 'message.mention')).toBe(1);
    // Asked not to be pinged; not a member; does not exist; the writer themself.
    expect(await told(quiet, 'message.mention')).toBe(0);
    expect(await told(outsider, 'message.mention')).toBe(0);
    expect(await told(thea, 'message.mention')).toBe(0);

    // A private channel: someone mentioned who cannot read it is never told what is in it.
    const role = await createRole(db, thea, communityId, { name: 'Staff', position: 100, permissions: [] });
    await assignRole(db, thea, role.id, thea.userId);
    const backroom = await createChannel(db, thea, communityId, { name: 'backroom', readRoleIds: [role.id] });
    await sendMessage(db, thea, backroom.conversationId, 'Do not tell @marcus about the party.');
    expect(await told(marcus, 'message.mention')).toBe(1);
  });
});
