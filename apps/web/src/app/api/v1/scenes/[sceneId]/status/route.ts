import { SCENE_STATUSES, type SceneStatus } from '@worldroot/contracts';
import { DomainError, setSceneStatus } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Move a scene to another lifecycle status. */
export const POST = route<{ sceneId: string }>(async ({ request, actor, params }) => {
  const { status } = await readJson(request);
  if (!SCENE_STATUSES.includes(status as SceneStatus)) throw new DomainError('invalid_input', 'Unknown status.');
  const { db } = await database();
  await setSceneStatus(db, actor, params.sceneId, status as SceneStatus);
  return new Response(null, { status: 204 });
});
