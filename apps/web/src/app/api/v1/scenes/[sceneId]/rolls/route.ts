import { rollInScene } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { publish } from '@/lib/live';
import { database } from '@/lib/server';

/** Roll dice in a scene. Only where the scene's community has DnD mode on. */
export const POST = route<{ sceneId: string }>(async ({ request, actor, params }) => {
  const { notation, characterId, reason } = await readJson(request);
  const { db } = await database();
  const { post, result } = await rollInScene(db, actor, params.sceneId, { notation, characterId, reason });
  // The roller watches the dice tumble for a little over a second and a half before they stop. Everyone's story, the
  // roller's included, hears of the new post just after that, so the story never gives the result away first.
  setTimeout(() => publish({ type: 'scene.post.created', sceneId: params.sceneId, seq: post.seq }), 1_700);
  return Response.json({ roll: { seq: post.seq, notation: result.notation, rolls: result.rolls, total: result.total } }, { status: 201 });
});
