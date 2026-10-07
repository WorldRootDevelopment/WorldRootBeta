import { joinScene } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Bring characters into a scene, joining it if needed. */
export const POST = route<{ sceneId: string }>(async ({ request, actor, params }) => {
  const body = await readJson(request);
  const characterIds = Array.isArray(body.characterIds) ? body.characterIds.filter((id): id is string => typeof id === 'string') : [];
  const { db } = await database();
  await joinScene(db, actor, params.sceneId, characterIds);
  return new Response(null, { status: 204 });
});
