import { saveDraft } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Save the signed-in writer's unsent post for this scene. An empty document clears it. */
export const PUT = route<{ sceneId: string }>(async ({ request, actor, params }) => {
  const body = await readJson(request);
  const { db } = await database();
  await saveDraft(db, actor, params.sceneId, {
    characterId: typeof body.characterId === 'string' ? body.characterId : null,
    content: body.content,
  });
  return new Response(null, { status: 204 });
});
