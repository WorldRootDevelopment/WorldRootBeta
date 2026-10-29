import { chapterTitleSchema, MAX_CHAPTER_CHARACTERS, MAX_CHAPTERS, storyInputSchema, type ContentRating, type StoryInput, type StoryVisibility } from '@worldroot/contracts';
import { characters, profiles, stories, storyChapters, storyCharacters, worlds, type Db } from '@worldroot/db';
import { EMPTY_DOC, InvalidDocumentError, parseDoc, renderHtml, toPlainText, type RichDoc } from '@worldroot/editor';
import { and, asc, count, desc, eq, inArray, isNull, max, ne, sql, sum } from 'drizzle-orm';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { parseInput } from '../platform/validate';

/**
 * Stories: writing done alone. A story belongs to one person, has chapters
 * written in the rich text editor, and can tag that person's own characters
 * and be set in one of their worlds. It is private until they say otherwise.
 */
export type Story = typeof stories.$inferSelect;
export type StoryChapter = typeof storyChapters.$inferSelect;

const missing = () => new DomainError('not_found', 'That story does not exist.');

const words = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

/** Whether the actor may read a story: its writer, WorldRoot staff, or anyone once it is not private. */
const canRead = (actor: Actor, story: Story) => story.ownerUserId === actor.userId || actor.platformRole === 'staff' || story.visibility !== 'private';

async function requireReadable(db: Db, actor: Actor, storyId: string): Promise<Story> {
  const [story] = await db.select().from(stories).where(eq(stories.id, storyId));
  // A story the actor may not read is indistinguishable from one that does not exist.
  if (!story || !canRead(actor, story)) throw missing();
  return story;
}

async function requireOwn(db: Db, actor: Actor, storyId: string): Promise<Story> {
  const [story] = await db.select().from(stories).where(eq(stories.id, storyId));
  if (!story || story.ownerUserId !== actor.userId) throw missing();
  return story;
}

/** Checks the tagged characters and the world are the writer's own, from their library. */
async function checkLinks(db: Db, actor: Actor, values: { worldId: string | null; characterIds: string[] }): Promise<string[]> {
  const ids = [...new Set(values.characterIds)];
  if (ids.length > 0) {
    const found = await db
      .select({ id: characters.id })
      .from(characters)
      .where(and(inArray(characters.id, ids), eq(characters.playerUserId, actor.userId), isNull(characters.communityId)));
    if (found.length !== ids.length) {
      const message = 'Tag only characters from your own library.';
      throw new DomainError('invalid_input', message, { fields: { characterIds: message } });
    }
  }
  if (values.worldId) {
    const [world] = await db.select({ id: worlds.id }).from(worlds).where(and(eq(worlds.id, values.worldId), eq(worlds.ownerUserId, actor.userId)));
    if (!world) {
      const message = 'Choose one of your own worlds.';
      throw new DomainError('invalid_input', message, { fields: { worldId: message } });
    }
  }
  return ids;
}

/** Starts a story with one empty chapter, ready to write in. */
export async function createStory(db: Db, actor: Actor, input: StoryInput): Promise<{ story: Story; chapter: StoryChapter }> {
  const values = parseInput(storyInputSchema, input);
  const characterIds = await checkLinks(db, actor, values);
  return db.transaction(async (tx) => {
    const [story] = await tx
      .insert(stories)
      .values({ ownerUserId: actor.userId, title: values.title, summary: values.summary, rating: values.rating, visibility: values.visibility, worldId: values.worldId })
      .returning();
    if (characterIds.length > 0) await tx.insert(storyCharacters).values(characterIds.map((characterId) => ({ storyId: story!.id, characterId })));
    const [chapter] = await tx.insert(storyChapters).values({ storyId: story!.id, position: 0, contentJson: EMPTY_DOC }).returning();
    return { story: story!, chapter: chapter! };
  });
}

/** Changes a story's details and who is in it. Only its writer can. */
export async function updateStory(db: Db, actor: Actor, storyId: string, input: StoryInput): Promise<Story> {
  await requireOwn(db, actor, storyId);
  const values = parseInput(storyInputSchema, input);
  const characterIds = await checkLinks(db, actor, values);
  return db.transaction(async (tx) => {
    const [story] = await tx
      .update(stories)
      .set({ title: values.title, summary: values.summary, rating: values.rating, visibility: values.visibility, worldId: values.worldId, ...(values.commentsOpen === undefined ? {} : { commentsOpen: values.commentsOpen }) })
      .where(eq(stories.id, storyId))
      .returning();
    await tx.delete(storyCharacters).where(eq(storyCharacters.storyId, storyId));
    if (characterIds.length > 0) await tx.insert(storyCharacters).values(characterIds.map((characterId) => ({ storyId, characterId })));
    return story!;
  });
}

/** Deletes a story and every chapter of it, for good. */
export async function deleteStory(db: Db, actor: Actor, storyId: string): Promise<void> {
  await requireOwn(db, actor, storyId);
  await db.delete(stories).where(eq(stories.id, storyId));
}

export interface StorySummary {
  id: string;
  title: string;
  summary: string | null;
  rating: ContentRating;
  visibility: StoryVisibility;
  chapterCount: number;
  wordCount: number;
  updatedAt: Date;
  authorName: string | null;
  authorHandle: string | null;
}

/** Story cards: totals per story, newest change first. */
async function summaries(db: Db, where: ReturnType<typeof and>): Promise<StorySummary[]> {
  const rows = await db
    .select({
      story: stories,
      authorName: profiles.displayName,
      authorHandle: profiles.handle,
      chapterCount: count(storyChapters.id),
      wordCount: sql<number>`coalesce(${sum(storyChapters.wordCount)}, 0)::int`,
      lastWritten: max(storyChapters.updatedAt),
    })
    .from(stories)
    .leftJoin(storyChapters, eq(storyChapters.storyId, stories.id))
    .leftJoin(profiles, eq(profiles.userId, stories.ownerUserId))
    .where(where)
    .groupBy(stories.id, profiles.userId)
    .orderBy(desc(sql`greatest(${stories.updatedAt}, coalesce(max(${storyChapters.updatedAt}), ${stories.updatedAt}))`));
  return rows.map(({ story, authorName, authorHandle, chapterCount, wordCount, lastWritten }) => ({
    id: story.id,
    title: story.title,
    summary: story.summary,
    rating: story.rating,
    visibility: story.visibility as StoryVisibility,
    chapterCount,
    wordCount,
    updatedAt: lastWritten && lastWritten > story.updatedAt ? lastWritten : story.updatedAt,
    authorName,
    authorHandle,
  }));
}

/** Everything the actor has written. */
export const listMyStories = (db: Db, actor: Actor) => summaries(db, and(eq(stories.ownerUserId, actor.userId)));

/** A writer's public stories, for their profile. Their own private and link-only stories show only to them. */
export const listProfileStories = (db: Db, actor: Actor, userId: string) =>
  summaries(db, and(eq(stories.ownerUserId, userId), userId === actor.userId ? undefined : eq(stories.visibility, 'public')));

/** The stories a character appears in that the actor may see listed: public ones, and any of the actor's own. */
export async function listCharacterStories(db: Db, actor: Actor, characterId: string): Promise<StorySummary[]> {
  const tagged = await db.select({ storyId: storyCharacters.storyId }).from(storyCharacters).where(eq(storyCharacters.characterId, characterId));
  if (tagged.length === 0) return [];
  const all = await summaries(
    db,
    and(
      inArray(
        stories.id,
        tagged.map((row) => row.storyId),
      ),
    ),
  );
  const own = await db
    .select({ id: stories.id })
    .from(stories)
    .where(
      and(
        eq(stories.ownerUserId, actor.userId),
        inArray(
          stories.id,
          tagged.map((row) => row.storyId),
        ),
      ),
    );
  const mine = new Set(own.map((row) => row.id));
  return all.filter((story) => story.visibility === 'public' || mine.has(story.id));
}

export interface StoryView {
  story: Story;
  isOwner: boolean;
  author: { name: string | null; handle: string | null };
  world: { id: string; name: string } | null;
  characters: Array<{ id: string; name: string }>;
  chapters: Array<{ id: string; position: number; title: string | null; wordCount: number; updatedAt: Date }>;
  wordCount: number;
}

/** A story's front page: its details, cast and contents. */
export async function getStory(db: Db, actor: Actor, storyId: string): Promise<StoryView> {
  const story = await requireReadable(db, actor, storyId);
  const [[author], world, cast, chapters] = await Promise.all([
    db.select({ name: profiles.displayName, handle: profiles.handle }).from(profiles).where(eq(profiles.userId, story.ownerUserId)),
    story.worldId ? db.select({ id: worlds.id, name: worlds.name }).from(worlds).where(eq(worlds.id, story.worldId)) : Promise.resolve([]),
    db
      .select({ id: characters.id, name: characters.name })
      .from(storyCharacters)
      .innerJoin(characters, eq(characters.id, storyCharacters.characterId))
      .where(eq(storyCharacters.storyId, storyId))
      .orderBy(asc(characters.name)),
    db
      .select({ id: storyChapters.id, position: storyChapters.position, title: storyChapters.title, wordCount: storyChapters.wordCount, updatedAt: storyChapters.updatedAt })
      .from(storyChapters)
      .where(eq(storyChapters.storyId, storyId))
      .orderBy(asc(storyChapters.position), asc(storyChapters.createdAt)),
  ]);
  return {
    story,
    isOwner: story.ownerUserId === actor.userId,
    author: author ?? { name: null, handle: null },
    world: world[0] ?? null,
    characters: cast,
    chapters,
    wordCount: chapters.reduce((total, chapter) => total + chapter.wordCount, 0),
  };
}

export interface ChapterView {
  story: { id: string; title: string; isOwner: boolean };
  chapter: { id: string; title: string | null; html: string; wordCount: number; updatedAt: Date };
  /** The editable document. Only for the writer. */
  doc: RichDoc | null;
  number: number;
  of: number;
  previous: { id: string; title: string | null } | null;
  next: { id: string; title: string | null } | null;
}

/** One chapter, for reading, or for its writer to edit. */
export async function getStoryChapter(db: Db, actor: Actor, storyId: string, chapterId: string): Promise<ChapterView> {
  const story = await requireReadable(db, actor, storyId);
  const all = await db
    .select({ id: storyChapters.id, title: storyChapters.title })
    .from(storyChapters)
    .where(eq(storyChapters.storyId, storyId))
    .orderBy(asc(storyChapters.position), asc(storyChapters.createdAt));
  const at = all.findIndex((row) => row.id === chapterId);
  if (at < 0) throw new DomainError('not_found', 'That chapter does not exist.');
  const [chapter] = await db.select().from(storyChapters).where(eq(storyChapters.id, chapterId));
  const isOwner = story.ownerUserId === actor.userId;
  return {
    story: { id: story.id, title: story.title, isOwner },
    chapter: { id: chapter!.id, title: chapter!.title, html: chapter!.contentHtml, wordCount: chapter!.wordCount, updatedAt: chapter!.updatedAt },
    doc: isOwner ? (chapter!.contentJson as RichDoc) : null,
    number: at + 1,
    of: all.length,
    previous: all[at - 1] ?? null,
    next: all[at + 1] ?? null,
  };
}

/** Adds an empty chapter at the end of a story. */
export async function addChapter(db: Db, actor: Actor, storyId: string): Promise<StoryChapter> {
  await requireOwn(db, actor, storyId);
  const [held] = await db.select({ value: count(), last: max(storyChapters.position) }).from(storyChapters).where(eq(storyChapters.storyId, storyId));
  if ((held?.value ?? 0) >= MAX_CHAPTERS) throw new DomainError('conflict', `A story can have ${MAX_CHAPTERS} chapters.`);
  const [chapter] = await db
    .insert(storyChapters)
    .values({ storyId, position: (held?.last ?? -1) + 1, contentJson: EMPTY_DOC })
    .returning();
  await db.update(stories).set({ updatedAt: new Date() }).where(eq(stories.id, storyId));
  return chapter!;
}

async function requireOwnChapter(db: Db, actor: Actor, chapterId: string): Promise<StoryChapter> {
  const [row] = await db
    .select({ chapter: storyChapters, ownerUserId: stories.ownerUserId })
    .from(storyChapters)
    .innerJoin(stories, eq(stories.id, storyChapters.storyId))
    .where(eq(storyChapters.id, chapterId));
  if (!row || row.ownerUserId !== actor.userId) throw new DomainError('not_found', 'That chapter does not exist.');
  return row.chapter;
}

/** Saves a chapter's title and words. Called as the writer types, so it does only what saving needs. */
export async function saveChapter(db: Db, actor: Actor, chapterId: string, input: { title?: unknown; content?: unknown }): Promise<{ wordCount: number; updatedAt: Date }> {
  await requireOwnChapter(db, actor, chapterId);
  const values: Partial<typeof storyChapters.$inferInsert> = {};
  if (input.title !== undefined) {
    const title = chapterTitleSchema.safeParse(input.title);
    if (!title.success) throw new DomainError('invalid_input', 'Use at most 160 characters.', { fields: { title: 'Use at most 160 characters.' } });
    values.title = title.data;
  }
  if (input.content !== undefined) {
    let doc: RichDoc;
    try {
      doc = parseDoc(input.content);
    } catch (error) {
      if (!(error instanceof InvalidDocumentError)) throw error;
      throw new DomainError('invalid_input', 'That chapter could not be read.', { fields: { content: error.message } });
    }
    const text = toPlainText(doc);
    if (text.length > MAX_CHAPTER_CHARACTERS) {
      const message = `Keep a chapter under ${MAX_CHAPTER_CHARACTERS.toLocaleString('en')} characters. Split it into two.`;
      throw new DomainError('invalid_input', message, { fields: { content: message } });
    }
    Object.assign(values, { contentJson: doc, contentHtml: renderHtml(doc), contentText: text, wordCount: words(text) });
  }
  const [saved] = await db.update(storyChapters).set(values).where(eq(storyChapters.id, chapterId)).returning();
  return { wordCount: saved!.wordCount, updatedAt: saved!.updatedAt };
}

/** Moves a chapter one place up or down. At either end it stays where it is. */
export async function moveChapter(db: Db, actor: Actor, chapterId: string, direction: 'up' | 'down'): Promise<void> {
  const chapter = await requireOwnChapter(db, actor, chapterId);
  await db.transaction(async (tx) => {
    const ordered = await tx
      .select({ id: storyChapters.id })
      .from(storyChapters)
      .where(eq(storyChapters.storyId, chapter.storyId))
      .orderBy(asc(storyChapters.position), asc(storyChapters.createdAt));
    const at = ordered.findIndex((row) => row.id === chapterId);
    const to = direction === 'up' ? at - 1 : at + 1;
    if (at < 0 || to < 0 || to >= ordered.length) return;
    [ordered[at], ordered[to]] = [ordered[to]!, ordered[at]!];
    for (const [position, row] of ordered.entries()) await tx.update(storyChapters).set({ position }).where(eq(storyChapters.id, row.id));
  });
}

/** Deletes a chapter for good. A story keeps at least one. */
export async function deleteChapter(db: Db, actor: Actor, chapterId: string): Promise<void> {
  const chapter = await requireOwnChapter(db, actor, chapterId);
  const [others] = await db.select({ value: count() }).from(storyChapters).where(and(eq(storyChapters.storyId, chapter.storyId), ne(storyChapters.id, chapterId)));
  if ((others?.value ?? 0) === 0) throw new DomainError('conflict', 'A story keeps at least one chapter. Delete the story instead.');
  await db.delete(storyChapters).where(eq(storyChapters.id, chapterId));
}

/**
 * A story as a Markdown file, for the reader to keep. The words are given as
 * plain text with paragraphs kept; formatting inside them is not carried over.
 */
export async function exportStory(db: Db, actor: Actor, storyId: string): Promise<{ filename: string; text: string }> {
  const view = await getStory(db, actor, storyId);
  const chapters = await db
    .select({ title: storyChapters.title, text: storyChapters.contentText })
    .from(storyChapters)
    .where(eq(storyChapters.storyId, storyId))
    .orderBy(asc(storyChapters.position), asc(storyChapters.createdAt));
  const lines = [`# ${view.story.title}`, ''];
  if (view.author.name) lines.push(`By ${view.author.name}`, '');
  if (view.story.summary) lines.push(view.story.summary, '');
  if (view.characters.length > 0) lines.push(`Characters: ${view.characters.map((character) => character.name).join(', ')}`, '');
  chapters.forEach((chapter, index) => {
    lines.push('---', '', `## ${chapter.title ?? `Chapter ${index + 1}`}`, '', chapter.text.replace(/\n+/g, '\n\n'), '');
  });
  const filename = `${view.story.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').toLowerCase() || 'story'}.md`;
  return { filename, text: lines.join('\n') };
}
