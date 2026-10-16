import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { docFromText } from '@worldroot/editor';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCommunity } from '../community/service';
import { createProfile } from '../identity/profile';
import { createReport, listReports } from '../moderation/reports';
import type { Actor } from '../platform/authorize';
import { createStory, saveChapter, updateStory } from '../stories/service';
import { addCharacterToCommunity, createCharacter, listLibraryCharacters, setCharacterTags } from './service';

let connection: DbConnection;
let thea: Actor;
let reader: Actor;
let staff: Actor;

const addUser = async (handle: string, platformRole: Actor['platformRole'] = 'user'): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com`, platformRole }).returning();
  const actor: Actor = { userId: user!.id, platformRole };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

beforeAll(async () => {
  connection = await createTestDb();
  thea = await addUser('thea');
  reader = await addUser('reader');
  staff = await addUser('warden', 'staff');
});

afterAll(async () => {
  await connection.close();
});

describe('library tags', () => {
  it('are the writer’s own, tidied, and stay out of community copies', async () => {
    const { db } = connection;
    const captain = await createCharacter(db, thea, { name: 'Captain Thea' });
    expect(await setCharacterTags(db, thea, captain.id, ['  Main Cast ', 'fantasy', 'main cast', 'Fantasy'])).toEqual(['Main Cast', 'fantasy']);
    expect((await listLibraryCharacters(db, thea.userId))[0]?.tags).toEqual(['Main Cast', 'fantasy']);

    await expect(setCharacterTags(db, reader, captain.id, ['Mine'])).rejects.toMatchObject({ code: 'not_found' });
    await expect(setCharacterTags(db, thea, captain.id, ['x'.repeat(25)])).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(setCharacterTags(db, thea, captain.id, Array.from({ length: 11 }, (_, index) => `tag ${index}`))).rejects.toMatchObject({ code: 'invalid_input' });

    const community = await createCommunity(db, thea, { slug: 'harbour', name: 'Harbour Lights' });
    const copy = await addCharacterToCommunity(db, thea, captain.id, community.id, {});
    expect(copy.tags).toEqual([]);
    await expect(setCharacterTags(db, thea, copy.id, ['Copy'])).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('reporting a story', () => {
  it('reaches WorldRoot staff, and only works on a story the reporter can read', async () => {
    const { db } = connection;
    const base = { title: 'Harbour Lights', rating: 'teen' as const, visibility: 'private' as const };
    const { story, chapter } = await createStory(db, thea, base);
    await saveChapter(db, thea, chapter.id, { content: docFromText('Something that breaks the rules.') });

    await expect(createReport(db, reader, { targetType: 'story', targetId: story.id, category: 'harassment' })).rejects.toMatchObject({ code: 'not_found' });

    await updateStory(db, thea, story.id, { ...base, visibility: 'unlisted' });
    const report = await createReport(db, reader, { targetType: 'story', targetId: story.id, category: 'harassment' });
    expect(report).toMatchObject({ communityId: null, escalated: true, subjectUserId: thea.userId });
    expect(report.snapshot).toMatchObject({ where: 'Story “Harbour Lights” by @thea', href: `/stories/${story.id}` });
    expect((report.snapshot as { text: string }).text).toContain('breaks the rules');
    expect((await listReports(db, staff, 'platform')).map((row) => row.id)).toContain(report.id);
  });
});
