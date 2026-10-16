import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { docFromText } from '@worldroot/editor';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCharacter } from '../characters/service';
import { createProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { createWorld } from '../worlds/service';
import {
  addChapter,
  createStory,
  deleteChapter,
  deleteStory,
  exportStory,
  getStory,
  getStoryChapter,
  listCharacterStories,
  listMyStories,
  listProfileStories,
  moveChapter,
  saveChapter,
  updateStory,
} from './service';

let connection: DbConnection;
let thea: Actor;
let reader: Actor;

const addUser = async (handle: string): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com` }).returning();
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle === 'thea' ? 'Thea Bunn' : handle, adultConfirmed: true });
  return actor;
};

beforeAll(async () => {
  connection = await createTestDb();
  thea = await addUser('thea');
  reader = await addUser('reader');
});

afterAll(async () => {
  await connection.close();
});

const gone = { code: 'not_found' };

describe('stories', () => {
  it('are written alone, in chapters, and stay private until shared', async () => {
    const { db } = connection;
    const captain = await createCharacter(db, thea, { name: 'Captain Thea' });
    const theirs = await createCharacter(db, reader, { name: 'Somebody Else' });
    const base = { title: 'The Late Train', rating: 'teen' as const, visibility: 'private' as const };

    // Only the writer's own characters can be tagged.
    await expect(createStory(db, thea, { ...base, characterIds: [theirs.id] })).rejects.toMatchObject({ code: 'invalid_input' });
    const { story, chapter } = await createStory(db, thea, { ...base, summary: 'A missed connection.', characterIds: [captain.id] });

    await saveChapter(db, thea, chapter.id, { title: 'Platform Four', content: docFromText('The 11:40 was late again.\n\nShe checked her watch.') });
    const second = await addChapter(db, thea, story.id);
    expect(await saveChapter(db, thea, second.id, { content: docFromText('The doors opened.') })).toMatchObject({ wordCount: 3 });

    const view = await getStory(db, thea, story.id);
    expect(view).toMatchObject({ isOwner: true, wordCount: 12, author: { name: 'Thea Bunn' }, characters: [{ name: 'Captain Thea' }] });
    expect(view.chapters.map((row) => row.title)).toEqual(['Platform Four', null]);

    // Private: nobody else can find it, or write in it.
    await expect(getStory(db, reader, story.id)).rejects.toMatchObject(gone);
    await expect(getStoryChapter(db, reader, story.id, chapter.id)).rejects.toMatchObject(gone);
    await expect(saveChapter(db, reader, chapter.id, { title: 'Mine now' })).rejects.toMatchObject(gone);
    expect(await listCharacterStories(db, reader, captain.id)).toEqual([]);
    expect(await listProfileStories(db, reader, thea.userId)).toEqual([]);
    expect((await listProfileStories(db, thea, thea.userId)).map((row) => row.title)).toEqual(['The Late Train']);

    // Link only: readable with the address, still not listed.
    await updateStory(db, thea, story.id, { ...base, visibility: 'unlisted', characterIds: [captain.id] });
    const read = await getStoryChapter(db, reader, story.id, chapter.id);
    expect(read).toMatchObject({ number: 1, of: 2, doc: null, next: { id: second.id } });
    expect(read.chapter.html).toContain('11:40');
    expect(await listProfileStories(db, reader, thea.userId)).toEqual([]);

    // Public: listed on the profile and the character's page.
    await updateStory(db, thea, story.id, { ...base, visibility: 'public', characterIds: [captain.id] });
    expect((await listProfileStories(db, reader, thea.userId)).map((row) => row.title)).toEqual(['The Late Train']);
    expect((await listCharacterStories(db, reader, captain.id)).map((row) => row.chapterCount)).toEqual([2]);
  });

  it('can be reordered, trimmed, downloaded and deleted', async () => {
    const { db } = connection;
    const world = await createWorld(db, thea, { name: 'Harbour Town' });
    const { story, chapter } = await createStory(db, thea, { title: 'Three Short Ones', rating: 'everyone', visibility: 'private', worldId: world.id });
    await saveChapter(db, thea, chapter.id, { title: 'One', content: docFromText('First.') });
    const two = await addChapter(db, thea, story.id);
    await saveChapter(db, thea, two.id, { title: 'Two', content: docFromText('Second.') });

    await moveChapter(db, thea, two.id, 'up');
    expect((await getStory(db, thea, story.id)).chapters.map((row) => row.title)).toEqual(['Two', 'One']);
    await expect(moveChapter(db, reader, two.id, 'down')).rejects.toMatchObject(gone);

    const file = await exportStory(db, thea, story.id);
    expect(file.filename).toBe('three-short-ones.md');
    expect(file.text).toMatch(/# Three Short Ones[\s\S]*## Two[\s\S]*Second\.[\s\S]*## One[\s\S]*First\./);
    await expect(exportStory(db, reader, story.id)).rejects.toMatchObject(gone);

    await deleteChapter(db, thea, two.id);
    await expect(deleteChapter(db, thea, chapter.id)).rejects.toMatchObject({ code: 'conflict' });
    expect((await getStory(db, thea, story.id)).world).toMatchObject({ name: 'Harbour Town' });

    await expect(deleteStory(db, reader, story.id)).rejects.toMatchObject(gone);
    await deleteStory(db, thea, story.id);
    expect((await listMyStories(db, thea)).map((row) => row.title)).toEqual(['The Late Train']);
  });
});
