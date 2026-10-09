import { notificationLine } from '@worldroot/contracts';
import { profiles, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { docFromText } from '@worldroot/editor';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCharacter } from '../characters/service';
import { createCommunity } from '../community/service';
import { touchPresence } from '../community/presence';
import { listConversations, startConversation } from '../messaging/service';
import { listNotifications } from '../notifications/service';
import type { Actor } from '../platform/authorize';
import { createScene, setSceneStatus } from '../scenes/service';
import { createLocation, createWorld } from '../worlds/service';
import { blockUser } from './account';
import { grantAchievement, listAchievementProgress, listAchievements } from './achievements';
import { acceptFriendRequest, countIncomingFriendRequests, friendState, listFriends, removeFriend, sendFriendRequest } from './friends';
import { createProfile, getProfile } from './profile';
import { updateProfile } from './profile-view';

let connection: DbConnection;

const addUser = async (handle: string): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com` }).returning();
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle[0]!.toUpperCase() + handle.slice(1), adultConfirmed: true });
  return actor;
};
const lines = async (actor: Actor) =>
  (await listNotifications(connection.db, actor)).map((n) => notificationLine(n.type, n.actors, n.count, n.subject));
const earned = async (actor: Actor) => (await listAchievements(connection.db, actor.userId)).map((row) => row.key);

beforeAll(async () => {
  connection = await createTestDb();
});

afterAll(async () => {
  await connection.close();
});

describe('friends', () => {
  it('are asked, accepted and removed, open direct messages, and end with a block', async () => {
    const { db } = connection;
    const thea = await addUser('thea');
    const marcus = await addUser('marcus');
    const sarah = await addUser('sarah');

    // Strangers begin with a message request.
    await startConversation(db, thea, { handles: ['marcus'] });
    expect((await listConversations(db, thea))[0]!.request).toBe('outgoing');

    await expect(sendFriendRequest(db, thea, 'nobody_here')).rejects.toMatchObject({ code: 'not_found' });
    await expect(sendFriendRequest(db, thea, 'thea')).rejects.toMatchObject({ code: 'invalid_input' });
    expect(await sendFriendRequest(db, thea, '@Marcus')).toBe('outgoing');
    // Asking twice changes nothing and does not nag.
    expect(await sendFriendRequest(db, thea, 'marcus')).toBe('outgoing');
    expect(await friendState(db, marcus.userId, thea.userId)).toBe('incoming');
    expect(await countIncomingFriendRequests(db, marcus.userId)).toBe(1);
    expect(await lines(marcus)).toEqual(['Thea sent you a friend request']);
    expect((await listFriends(db, marcus)).incoming.map((row) => row.handle)).toEqual(['thea']);
    expect((await listFriends(db, thea)).outgoing.map((row) => row.handle)).toEqual(['marcus']);

    // Only the person asked can accept.
    await expect(acceptFriendRequest(db, thea, marcus.userId)).rejects.toMatchObject({ code: 'not_found' });
    await expect(acceptFriendRequest(db, sarah, thea.userId)).rejects.toMatchObject({ code: 'not_found' });
    await acceptFriendRequest(db, marcus, thea.userId);
    expect(await friendState(db, thea.userId, marcus.userId)).toBe('friends');
    expect(await countIncomingFriendRequests(db, marcus.userId)).toBe(0);
    expect(await lines(thea)).toContain('Marcus accepted your friend request');

    // Friends see each other online, unless one is appearing offline.
    await touchPresence(db, marcus);
    expect((await listFriends(db, thea)).friends).toMatchObject([{ handle: 'marcus', online: true }]);
    await db.update(profiles).set({ hideOnline: true }).where(eq(profiles.userId, marcus.userId));
    expect((await listFriends(db, thea)).friends[0]!.online).toBe(false);

    // Asking someone who has already asked you makes you friends at once.
    await sendFriendRequest(db, sarah, 'thea');
    expect(await sendFriendRequest(db, thea, 'sarah')).toBe('friends');
    // A friend can be messaged directly, with no request.
    await startConversation(db, thea, { handles: ['sarah'] });
    expect((await listConversations(db, sarah)).find((row) => row.title === 'Thea')?.request).toBeNull();

    // Unfriending is quiet, and either side may do it.
    await removeFriend(db, sarah, thea.userId);
    expect(await friendState(db, thea.userId, sarah.userId)).toBe('none');

    // A block ends the friendship, and the blocked person cannot ask again or learn why.
    await blockUser(db, marcus, thea.userId);
    expect(await friendState(db, thea.userId, marcus.userId)).toBe('none');
    await expect(sendFriendRequest(db, thea, 'marcus')).rejects.toMatchObject({ code: 'not_found', message: 'No one with that handle can be added.' });
  });
});

describe('a profile of your own', () => {
  it('takes a status line and a color, and leaves them alone when they are not sent', async () => {
    const { db } = connection;
    const wren = await addUser('wren');
    const base = { displayName: 'Wren', pronouns: null, bio: null, hideOnline: false };
    expect(await updateProfile(db, wren, { ...base, status: '  Writing slowly this week ', accentHue: 280 })).toMatchObject({
      status: 'Writing slowly this week',
      accentHue: 280,
      bannerId: null,
    });
    expect(await updateProfile(db, wren, base)).toMatchObject({ status: 'Writing slowly this week', accentHue: 280 });
    expect(await updateProfile(db, wren, { ...base, status: '', accentHue: null })).toMatchObject({ status: null, accentHue: null });
    await expect(updateProfile(db, wren, { ...base, accentHue: 400 })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(updateProfile(db, wren, { ...base, status: 'x'.repeat(81) })).rejects.toMatchObject({ code: 'invalid_input' });
    expect((await getProfile(db, wren.userId))!.status).toBeNull();
  });
});

describe('achievements', () => {
  it('are earned by doing things, once each, and announced', async () => {
    const { db } = connection;
    const ada = await addUser('ada');
    expect(await earned(ada)).toEqual([]);

    for (let i = 1; i <= 9; i += 1) await createCharacter(db, ada, { name: `Character ${i}` });
    expect(await earned(ada)).toEqual(['new_face']);
    const tenth = await createCharacter(db, ada, { name: 'Character 10' });
    expect(await earned(ada)).toEqual(['new_face', 'ensemble_cast']);

    const world = await createWorld(db, ada, { name: 'Atlas' });
    for (let i = 1; i <= 4; i += 1) await createLocation(db, ada, world.id, { name: `Place ${i}` });
    expect(await earned(ada)).not.toContain('worldbuilder');
    await createLocation(db, ada, world.id, { name: 'Place 5' });
    expect(await earned(ada)).toContain('worldbuilder');
    expect(await earned(ada)).not.toContain('cartographer');

    await createCommunity(db, ada, { slug: 'atlas', name: 'Atlas' });
    const opening = await createScene(db, ada, { title: 'Opening', rating: 'everyone', characterIds: [tenth.id], openingPost: docFromText('Once.') });
    // Shown in the registry's order, whatever order they were earned in.
    expect(await earned(ada)).toEqual(['first_words', 'new_face', 'ensemble_cast', 'world_seed', 'worldbuilder', 'host']);

    // Progress counts toward what is not yet earned, and an earned one reads as complete.
    const progress = new Map((await listAchievementProgress(db, ada.userId)).map((row) => [row.key, row]));
    expect(progress.get('cartographer')).toMatchObject({ current: 5, target: 25, earnedAt: null });
    expect(progress.get('scene_setter')).toMatchObject({ current: 1, target: 5 });
    expect(progress.get('ensemble_cast')).toMatchObject({ current: 10, target: 10 });
    expect(progress.get('natural_20')).toMatchObject({ current: 0, target: 1 });

    // Finishing the scene earns its creator The end.
    await setSceneStatus(db, ada, opening.id, 'completed');
    expect(await earned(ada)).toContain('the_end');

    // Granting one twice changes nothing and tells nobody twice.
    expect(await grantAchievement(db, ada.userId, 'natural_20')).toBe(true);
    expect(await grantAchievement(db, ada.userId, 'natural_20')).toBe(false);
    const told = await lines(ada);
    expect(told.filter((line) => line === 'You have a new badge: Natural 20')).toHaveLength(1);
    expect(told).toContain('You have a new badge: Ensemble cast');
    // Most achievements are not badges. Worldbuilder is both, so it joins the badge row.
    expect((await getProfile(db, ada.userId))!.badges).toEqual(['worldbuilder']);
  });
});
