import type { StoryInput } from '@worldroot/contracts';
import { createStory } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Start a story. It begins with one empty chapter. */
export const POST = route(async ({ request, actor }) => {
  const input = (await readJson(request)) as unknown as StoryInput;
  const { db } = await database();
  const { story, chapter } = await createStory(db, actor, input);
  return Response.json({ story: { id: story.id }, chapter: { id: chapter.id } }, { status: 201 });
});
