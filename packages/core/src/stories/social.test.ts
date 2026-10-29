import { notifications, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { docFromText } from '@worldroot/editor';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { updateCommunity } from '../community/admin';
import { createCommunity, joinCommunity } from '../community/service';
import { blockUser } from '../identity/account';
import { acceptFriendRequest, sendFriendRequest } from '../identity/friends';
import { createProfile } from '../identity/profile';
import { updateProfile } from '../identity/profile-view';
import { startConversation } from '../messaging/service';
import { createReport } from '../moderation/reports';
import type { Actor } from '../platform/authorize';
import { createStory, saveChapter, updateStory } from './service';
import { addComment, getKudos, listChapterComments, removeComment, toggleKudos } from './social';

let connection: DbConnection;
let thea: Actor;
let reader: Actor;
let rude: Actor;

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
  thea = await addUser('thea');
  reader = await addUser('reader');
  rude = await addUser('rude');
});

afterAll(async () => {
  await connection.close();
});

describe('kudos and comments', () => {
  it('only come to stories others can read, once each, and never from the writer', async () => {
    const { db } = connection;
    const base = { title: 'The Late Train', rating: 'teen' as const, visibility: 'private' as const };
    const { story, chapter } = await createStory(db, thea, base);
    await saveChapter(db, thea, chapter.id, { content: docFromText('The 11:40 was late again.') });

    await expect(toggleKudos(db, reader, story.id)).rejects.toMatchObject({ code: 'not_found' });
    await expect(addComment(db, reader, story.id, chapter.id, 'Lovely.')).rejects.toMatchObject({ code: 'not_found' });

    await updateStory(db, thea, story.id, { ...base, visibility: 'unlisted' });
    expect(await toggleKudos(db, reader, story.id)).toEqual({ count: 1, mine: true });
    expect(await getKudos(db, thea, story.id)).toEqual({ count: 1, mine: false });
    expect(await told(thea, 'story.kudos')).toBe(1);
    await expect(toggleKudos(db, thea, story.id)).rejects.toMatchObject({ code: 'invalid_input' });
    expect(await toggleKudos(db, reader, story.id)).toEqual({ count: 0, mine: false });

    const comment = await addComment(db, reader, story.id, chapter.id, '  Loved the ending.  ');
    expect(await told(thea, 'story.comment')).toBe(1);
    expect(await listChapterComments(db, thea, story.id, chapter.id)).toMatchObject([{ id: comment.id, body: 'Loved the ending.', authorName: 'reader', mine: false, canRemove: true }]);
    expect((await listChapterComments(db, rude, story.id, chapter.id))[0]?.canRemove).toBe(false);
    await expect(addComment(db, reader, story.id, chapter.id, ' ')).rejects.toMatchObject({ code: 'invalid_input' });

    // Reportable, to staff.
    expect(await createReport(db, rude, { targetType: 'story_comment', targetId: comment.id, category: 'harassment' })).toMatchObject({ communityId: null, escalated: true });

    // Closed comments, and blocks, keep people out; the writer can still remove anything on their story.
    await updateStory(db, thea, story.id, { ...base, visibility: 'unlisted', commentsOpen: false });
    await expect(addComment(db, rude, story.id, chapter.id, 'Hmm.')).rejects.toMatchObject({ code: 'forbidden' });
    await updateStory(db, thea, story.id, { ...base, visibility: 'unlisted', commentsOpen: true });
    await blockUser(db, thea, rude.userId);
    await expect(addComment(db, rude, story.id, chapter.id, 'Hmm.')).rejects.toMatchObject({ code: 'forbidden' });

    await expect(removeComment(db, rude, comment.id)).rejects.toMatchObject({ code: 'forbidden' });
    await removeComment(db, thea, comment.id);
    expect(await listChapterComments(db, thea, story.id, chapter.id)).toEqual([]);
  });
});

describe('closed direct messages', () => {
  it('turn away new conversations from anyone but friends', async () => {
    const { db } = connection;
    const shy = await addUser('shy');
    const friend = await addUser('pal');
    await updateProfile(db, shy, { displayName: 'Shy', hideOnline: false, playerRoles: ['dms:closed'] });
    await expect(startConversation(db, reader, { handles: ['shy'] })).rejects.toMatchObject({ code: 'forbidden' });

    await sendFriendRequest(db, friend, 'shy');
    await acceptFriendRequest(db, shy, friend.userId);
    expect((await startConversation(db, friend, { handles: ['shy'] })).kind).toBe('direct');

    // A group with them is refused the same way, for the one who is not a friend.
    const community = await createCommunity(db, reader, { slug: 'meet', name: 'Meet', listed: true });
    await joinCommunity(db, shy, community.id);
    await joinCommunity(db, friend, community.id);
    await expect(startConversation(db, reader, { handles: ['shy', 'pal'] })).rejects.toMatchObject({ code: 'forbidden' });
  });
});

describe('the chronicle setting', () => {
  it('is off for a new community and can be switched on', async () => {
    const { db } = connection;
    const community = await createCommunity(db, thea, { slug: 'harbour', name: 'Harbour Lights' });
    expect(community.chronicle).toBe(false);
    const settings = { name: 'Harbour Lights', accentHue: 155, listed: false, requireCharacterApproval: false };
    expect((await updateCommunity(db, thea, community.id, { ...settings, chronicle: true })).chronicle).toBe(true);
    expect((await updateCommunity(db, thea, community.id, settings)).chronicle).toBe(true);
  });
});
