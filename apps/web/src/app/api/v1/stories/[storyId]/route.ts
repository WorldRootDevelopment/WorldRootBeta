import type { StoryInput } from '@worldroot/contracts';
import { deleteStory, updateStory } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Change a story's details. */
export const PATCH = route<{ storyId: string }>(async ({ request, actor, params }) => {
  const input = (await readJson(request)) as unknown as StoryInput;
  const { db } = await database();
  const story = await updateStory(db, actor, params.storyId, input);
  return Response.json({ story: { id: story.id } });
});

/** Delete a story and all its chapters. */
export const DELETE = route<{ storyId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await deleteStory(db, actor, params.storyId);
  return new Response(null, { status: 204 });
});
