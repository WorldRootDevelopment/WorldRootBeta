import { notificationLine } from '@worldroot/contracts';
import { notifications, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { docFromText } from '@worldroot/editor';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCharacterToCommunity, createCharacter } from '../characters/service';
import { assignRole, createManagedRole, reviewCharacter, updateCommunity } from '../community/admin';
import { createCommunity, joinCommunity } from '../community/service';
import { blockUser } from '../identity/account';
import { setBadge } from '../identity/badges';
import { createProfile } from '../identity/profile';
import { getSpace, sendMessage } from '../messaging/service';
import { createReport } from '../moderation/reports';
import type { Actor } from '../platform/authorize';
import { createPost, createScene, inviteToScene, joinScene } from '../scenes/service';
import { countUnreadNotifications, listNotifications, markNotificationsRead } from './service';

let connection: DbConnection;

const addUser = async (handle: string, displayName = handle, isStaff = false): Promise<Actor> => {
  const [user] = await connection.db
    .insert(users)
    .values({ name: handle, email: `${handle}@example.com`, platformRole: isStaff ? 'staff' : 'user' })
    .returning();
  const actor: Actor = { userId: user!.id, platformRole: isStaff ? 'staff' : 'user' };
  await createProfile(connection.db, actor, { handle, displayName, adultConfirmed: true });
  return actor;
};

const say = (text: string) => docFromText(text);
const lines = async (actor: Actor) =>
  (await listNotifications(connection.db, actor)).map((n) => notificationLine(n.type, n.actors, n.count, n.subject));

/** Clears the notices about achievements earned along the way, which these tests are not about. */
const quiet = () => connection.db.delete(notifications).where(eq(notifications.type, 'badge.granted'));

beforeAll(async () => {
  connection = await createTestDb();
});

afterAll(async () => {
  await connection.close();
});

describe('the wording', () => {
  it('names people and counts sensibly', () => {
    expect(notificationLine('scene.post', ['Marcus'], 1, 'The Late Train')).toBe('Marcus posted in The Late Train');
    expect(notificationLine('scene.post', ['Marcus', 'Sarah'], 4, 'The Late Train')).toBe('Marcus and Sarah posted 4 times in The Late Train');
    expect(notificationLine('scene.post', ['A', 'B', 'C'], 9, 'X')).toBe('A, B and 1 other posted 9 times in X');
    expect(notificationLine('character.pending', [], 2, 'Valley')).toBe('2 characters are waiting for review in Valley');
    expect(notificationLine('from.the.future', [], 1, 'Something new')).toBe('Something new');
  });
});

describe('scene notifications', () => {
  it('fold repeated posts into one line, and never notify the author or across a block', async () => {
    const { db } = connection;
    const thea = await addUser('thea', 'Thea');
    const marcus = await addUser('marcus', 'Marcus');
    const sarah = await addUser('sarah', 'Sarah');
    const [mine, his, hers] = [await createCharacter(db, thea, { name: 'Captain' }), await createCharacter(db, marcus, { name: 'Hale' }), await createCharacter(db, sarah, { name: 'Finch' })];
    const scene = await createScene(db, thea, { title: 'The Late Train', rating: 'everyone', characterIds: [mine.id], openingPost: say('Late again.') });

    await quiet();
    await inviteToScene(db, thea, scene.id, 'marcus');
    await inviteToScene(db, thea, scene.id, 'sarah');
    expect(await lines(marcus)).toEqual(['Thea invited you to the scene The Late Train']);
    await joinScene(db, marcus, scene.id, [his.id]);
    await joinScene(db, sarah, scene.id, [hers.id]);

    await createPost(db, marcus, scene.id, { kind: 'ic', characterId: his.id, content: say('He had saved her a seat.') });
    await createPost(db, sarah, scene.id, { kind: 'ic', characterId: hers.id, content: say('The carriage was almost empty.') });
    await createPost(db, marcus, scene.id, { kind: 'ic', characterId: his.id, content: say('He waved.') });
    // Out-of-character chatter does not notify.
    await createPost(db, marcus, scene.id, { kind: 'ooc', content: say('brb') });

    await quiet();
    const forThea = await listNotifications(db, thea);
    expect(forThea).toHaveLength(1);
    expect(forThea[0]).toMatchObject({ count: 3, actors: ['Marcus', 'Sarah'], preview: 'He waved.', href: `/scenes/${scene.id}#post-4` });
    expect(await lines(thea)).toEqual(['Marcus and Sarah posted 3 times in The Late Train']);
    // Marcus is told about Sarah's post, not his own.
    expect((await lines(marcus))[0]).toBe('Sarah posted in The Late Train');
    expect(await countUnreadNotifications(db, thea.userId)).toBe(1);

    // Once read, the next post starts a fresh line instead of reviving the old one.
    await markNotificationsRead(db, thea);
    expect(await countUnreadNotifications(db, thea.userId)).toBe(0);
    await createPost(db, sarah, scene.id, { kind: 'ic', characterId: hers.id, content: say('She sat down.') });
    expect((await listNotifications(db, thea)).map((n) => [n.count, Boolean(n.readAt)])).toEqual([
      [1, false],
      [3, true],
    ]);

    // After a block, the blocked person's posts no longer notify.
    await blockUser(db, thea, marcus.userId);
    await createPost(db, marcus, scene.id, { kind: 'ic', characterId: his.id, content: say('He said nothing.') });
    expect((await listNotifications(db, thea))[0]).toMatchObject({ count: 1, actors: ['Sarah'] });

    // One person cannot mark another's notifications read.
    const [note] = await listNotifications(db, sarah);
    await markNotificationsRead(db, thea, note!.id);
    expect((await listNotifications(db, sarah))[0]!.readAt).toBeNull();
  });
});

describe('community notifications', () => {
  it('reach reviewers, players, members and staff at the right moments', async () => {
    const { db } = connection;
    const owner = await addUser('owner', 'Owner');
    const reviewer = await addUser('reviewer', 'Reviewer');
    const player = await addUser('player', 'Player');
    const staff = await addUser('staffer', 'Staffer', true);
    const community = await createCommunity(db, owner, { slug: 'valley', name: 'Valley', listed: true });
    await joinCommunity(db, reviewer, community.id);
    await joinCommunity(db, player, community.id);
    const role = await createManagedRole(db, owner, community.id, { name: 'Reviewer', permissions: ['character.approve', 'report.review'] });
    await assignRole(db, owner, role.id, reviewer.userId);
    await quiet();
    expect(await lines(reviewer)).toEqual(['You were given a new role in Valley']);

    await updateCommunity(db, owner, community.id, { name: 'Valley', accentHue: 155, listed: true, requireCharacterApproval: true });
    const original = await createCharacter(db, player, { name: 'Sarah Finch' });
    const copy = await addCharacterToCommunity(db, player, original.id, community.id);
    await quiet();
    // Everyone who can approve is told, including the owner. The player is not told about their own submission.
    expect((await lines(reviewer))[0]).toBe('A character is waiting for review in Valley');
    expect(await lines(owner)).toEqual(['A character is waiting for review in Valley']);
    expect(await lines(player)).toEqual([]);

    await reviewCharacter(db, reviewer, copy.id, 'returned');
    await reviewCharacter(db, reviewer, copy.id, 'approved');
    // The second decision folds into the first while it is unread, and shows the latest outcome.
    expect((await listNotifications(db, player)).map((n) => [n.type, n.count])).toEqual([['character.returned', 2]]);
    await markNotificationsRead(db, player);

    const news = await getSpace(db, owner, community.id, 'announcements');
    await sendMessage(db, owner, news.conversation.id, 'The first world opens on Friday.');
    expect((await lines(player))[0]).toBe('Owner posted an announcement in Valley');
    // The Lounge is chatter and stays quiet.
    const lounge = await getSpace(db, player, community.id, 'lounge');
    const rude = await sendMessage(db, player, lounge.conversation.id, 'Something rude.');
    expect((await listNotifications(db, owner)).filter((n) => n.type === 'announcement')).toEqual([]);

    await createReport(db, reviewer, { targetType: 'message', targetId: rude.id, category: 'threat' });
    // The other reviewer (the owner) and staff are told there is a report. It does not say who or what.
    const forOwner = (await listNotifications(db, owner))[0]!;
    expect(notificationLine(forOwner.type, forOwner.actors, forOwner.count, forOwner.subject)).toBe('A new report is waiting in Valley');
    expect(forOwner).toMatchObject({ actors: [], preview: null, href: '/c/valley/settings/reports' });
    expect(await lines(staff)).toEqual(['A new report is waiting in the staff queue']);

    await quiet();
    await setBadge(db, staff, player.userId, 'beta_tester', true);
    expect((await lines(player))[0]).toBe('You have a new badge: Beta tester');
  });
});
