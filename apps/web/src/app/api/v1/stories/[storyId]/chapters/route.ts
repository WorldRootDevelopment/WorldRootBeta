import { addChapter } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Add an empty chapter at the end of a story. */
export const POST = route<{ storyId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  const chapter = await addChapter(db, actor, params.storyId);
  return Response.json({ chapter: { id: chapter.id } }, { status: 201 });
});
