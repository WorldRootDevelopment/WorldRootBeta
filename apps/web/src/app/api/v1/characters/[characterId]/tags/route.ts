import { setCharacterTags } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Set the labels a library character is sorted by. */
export const PUT = route<{ characterId: string }>(async ({ request, actor, params }) => {
  const { tags } = await readJson(request);
  const { db } = await database();
  return Response.json({ tags: await setCharacterTags(db, actor, params.characterId, tags) });
});
