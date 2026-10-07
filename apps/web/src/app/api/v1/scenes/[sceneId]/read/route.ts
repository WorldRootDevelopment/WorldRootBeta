import { markSceneRead } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Record how far the signed-in reader has read. */
export const POST = route<{ sceneId: string }>(async ({ request, actor, params }) => {
  const { seq } = await readJson(request);
  const { db } = await database();
  await markSceneRead(db, actor, params.sceneId, typeof seq === 'number' ? seq : -1);
  return new Response(null, { status: 204 });
});
