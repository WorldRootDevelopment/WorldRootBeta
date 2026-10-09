import { rollInScene } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { publish } from '@/lib/live';
import { database } from '@/lib/server';

/** Roll dice in a scene. Only where the scene's community has DnD mode on. */
export const POST = route<{ sceneId: string }>(async ({ request, actor, params }) => {
  const { notation, characterId, reason } = await readJson(request);
  const { db } = await database();
  const { post, result } = await rollInScene(db, actor, params.sceneId, { notation, characterId, reason });
  publish({ type: 'scene.post.created', sceneId: params.sceneId, seq: post.seq });
  return Response.json({ roll: { seq: post.seq, notation: result.notation, rolls: result.rolls, total: result.total } }, { status: 201 });
});
