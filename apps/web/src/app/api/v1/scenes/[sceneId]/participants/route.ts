import { inviteToScene } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Invite someone to a private scene by handle. */
export const POST = route<{ sceneId: string }>(async ({ request, actor, params }) => {
  const body = await readJson(request);
  const { db } = await database();
  await inviteToScene(db, actor, params.sceneId, typeof body.handle === 'string' ? body.handle : '');
  return new Response(null, { status: 204 });
});
