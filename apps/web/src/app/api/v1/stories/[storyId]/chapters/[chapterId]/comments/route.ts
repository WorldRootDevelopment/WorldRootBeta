import { addComment } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Comment on a chapter. */
export const POST = route<{ storyId: string; chapterId: string }>(async ({ request, actor, params }) => {
  const { body } = await readJson(request);
  const { db } = await database();
  return Response.json({ comment: await addComment(db, actor, params.storyId, params.chapterId, body) }, { status: 201 });
});
