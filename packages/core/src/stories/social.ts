import { profiles, stories, storyChapters, storyComments, storyKudos, type Db } from '@worldroot/db';
import { and, asc, count, eq } from 'drizzle-orm';
import { isBlockedBetween } from '../identity/account';
import { notify } from '../notifications/service';
import { recordAudit } from '../platform/audit';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';

/**
 * What readers can give a story: kudos, one per person, and comments on its
 * chapters. Only on stories other people can read; a private story has no
 * readers but its writer. The writer can close comments on a story and
 * remove any comment on it.
 */

export const MAX_COMMENT_CHARACTERS = 2_000;

const missing = () => new DomainError('not_found', 'That story does not exist.');

/** A story the actor may read and is not theirs, ready to be given something. */
async function readableByOthers(db: Db, actor: Actor, storyId: string) {
  const [story] = await db.select().from(stories).where(eq(stories.id, storyId));
  if (!story || (story.visibility === 'private' && story.ownerUserId !== actor.userId && actor.platformRole !== 'staff')) throw missing();
  return story;
}

export interface StoryKudos {
  count: number;
  /** The actor has given kudos. */
  mine: boolean;
}

export async function getKudos(db: Db, actor: Actor, storyId: string): Promise<StoryKudos> {
  const [[total], [own]] = await Promise.all([
    db.select({ value: count() }).from(storyKudos).where(eq(storyKudos.storyId, storyId)),
    db.select({ value: count() }).from(storyKudos).where(and(eq(storyKudos.storyId, storyId), eq(storyKudos.userId, actor.userId))),
  ]);
  return { count: total?.value ?? 0, mine: (own?.value ?? 0) > 0 };
}

/** Gives kudos to a story, or takes them back. Not to your own. The writer is told the first time each person gives them. */
export async function toggleKudos(db: Db, actor: Actor, storyId: string): Promise<StoryKudos> {
  const story = await readableByOthers(db, actor, storyId);
  if (story.ownerUserId === actor.userId) throw new DomainError('invalid_input', 'You cannot give kudos to your own story.');
  const removed = await db
    .delete(storyKudos)
    .where(and(eq(storyKudos.storyId, storyId), eq(storyKudos.userId, actor.userId)))
    .returning({ userId: storyKudos.userId });
  if (removed.length === 0) {
    await db.insert(storyKudos).values({ storyId, userId: actor.userId }).onConflictDoNothing();
    await notify(db, { userId: story.ownerUserId, type: 'story.kudos', groupKey: `story:${storyId}:kudos`, subject: story.title, href: `/stories/${storyId}`, actorUserId: actor.userId });
  }
  return getKudos(db, actor, storyId);
}

export interface CommentRow {
  id: string;
  body: string;
  authorName: string | null;
  authorHandle: string | null;
  createdAt: Date;
  mine: boolean;
  /** The viewer may remove it: its author, the story's writer, or staff. */
  canRemove: boolean;
}

/** A chapter's comments, oldest first. Removed ones are left out. */
export async function listChapterComments(db: Db, actor: Actor, storyId: string, chapterId: string): Promise<CommentRow[]> {
  const story = await readableByOthers(db, actor, storyId);
  const rows = await db
    .select({ comment: storyComments, authorName: profiles.displayName, authorHandle: profiles.handle })
    .from(storyComments)
    .leftJoin(profiles, eq(profiles.userId, storyComments.authorUserId))
    .where(and(eq(storyComments.storyId, storyId), eq(storyComments.chapterId, chapterId)))
    .orderBy(asc(storyComments.createdAt));
  return rows
    .filter((row) => !row.comment.removedAt)
    .map(({ comment, authorName, authorHandle }) => ({
      id: comment.id,
      body: comment.body,
      authorName,
      authorHandle,
      createdAt: comment.createdAt,
      mine: comment.authorUserId === actor.userId,
      canRemove: comment.authorUserId === actor.userId || story.ownerUserId === actor.userId || actor.platformRole === 'staff',
    }));
}

/** Comments on a chapter. Anyone who can read the story may, unless its writer has closed comments or one has blocked the other. */
export async function addComment(db: Db, actor: Actor, storyId: string, chapterId: string, body: unknown): Promise<{ id: string }> {
  const story = await readableByOthers(db, actor, storyId);
  const [chapter] = await db.select({ id: storyChapters.id, title: storyChapters.title }).from(storyChapters).where(and(eq(storyChapters.id, chapterId), eq(storyChapters.storyId, storyId)));
  if (!chapter) throw new DomainError('not_found', 'That chapter does not exist.');
  if (!story.commentsOpen && story.ownerUserId !== actor.userId) throw new DomainError('forbidden', 'The writer has closed comments on this story.');
  if (story.ownerUserId !== actor.userId && (await isBlockedBetween(db, actor.userId, story.ownerUserId))) throw new DomainError('forbidden', 'You cannot comment on this story.');
  const text = typeof body === 'string' ? body.replace(/\r\n?/g, '\n').trim() : '';
  if (!text) throw new DomainError('invalid_input', 'Write a comment first.', { fields: { body: 'Write a comment first.' } });
  if (text.length > MAX_COMMENT_CHARACTERS) {
    const message = `Keep it under ${MAX_COMMENT_CHARACTERS.toLocaleString('en')} characters.`;
    throw new DomainError('invalid_input', message, { fields: { body: message } });
  }
  const [row] = await db.insert(storyComments).values({ storyId, chapterId, authorUserId: actor.userId, body: text }).returning({ id: storyComments.id });
  await notify(db, {
    userId: story.ownerUserId,
    type: 'story.comment',
    groupKey: `story:${storyId}:comments`,
    subject: story.title,
    href: `/stories/${storyId}/${chapterId}#comments`,
    actorUserId: actor.userId,
    preview: text,
  });
  return row!;
}

/** Removes a comment: its author may, so may the story's writer, and staff, which is recorded. */
export async function removeComment(db: Db, actor: Actor, commentId: string): Promise<void> {
  const [row] = await db
    .select({ comment: storyComments, ownerUserId: stories.ownerUserId })
    .from(storyComments)
    .innerJoin(stories, eq(stories.id, storyComments.storyId))
    .where(eq(storyComments.id, commentId));
  if (!row || row.comment.removedAt) return;
  const own = row.comment.authorUserId === actor.userId;
  const writer = row.ownerUserId === actor.userId;
  if (!own && !writer && actor.platformRole !== 'staff') throw new DomainError('forbidden', 'You cannot remove this comment.');
  await db.transaction(async (tx) => {
    await tx.update(storyComments).set({ removedAt: new Date(), removedByUserId: actor.userId }).where(eq(storyComments.id, commentId));
    if (!own && !writer) await recordAudit(tx, { actor, action: 'story.comment.remove', targetType: 'story_comment', targetId: commentId });
  });
}

/** Opens or closes comments on a story. Its writer only. */
export async function setCommentsOpen(db: Db, actor: Actor, storyId: string, open: boolean): Promise<void> {
  const [story] = await db.select({ ownerUserId: stories.ownerUserId }).from(stories).where(eq(stories.id, storyId));
  if (!story || story.ownerUserId !== actor.userId) throw missing();
  await db.update(stories).set({ commentsOpen: open }).where(eq(stories.id, storyId));
}
