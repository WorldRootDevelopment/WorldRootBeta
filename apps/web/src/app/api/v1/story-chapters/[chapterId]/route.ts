import { deleteChapter, moveChapter, saveChapter } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Save a chapter's title or words, or move it one place with `{ move: 'up' | 'down' }`. */
export const PATCH = route<{ chapterId: string }>(async ({ request, actor, params }) => {
  const input = await readJson(request);
  const { db } = await database();
  if (input.move === 'up' || input.move === 'down') {
    await moveChapter(db, actor, params.chapterId, input.move);
    return new Response(null, { status: 204 });
  }
  const saved = await saveChapter(db, actor, params.chapterId, { title: input.title, content: input.content });
  return Response.json(saved);
});

/** Delete a chapter. */
export const DELETE = route<{ chapterId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await deleteChapter(db, actor, params.chapterId);
  return new Response(null, { status: 204 });
});
