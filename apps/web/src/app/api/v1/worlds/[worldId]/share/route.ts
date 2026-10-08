import { setWorldSharing } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Turn sharing of a library world on or off. On gives it an ID; off retires the ID. */
export const POST = route<{ worldId: string }>(async ({ request, actor, params }) => {
  const { shared } = await readJson(request);
  const { db } = await database();
  const world = await setWorldSharing(db, actor, params.worldId, shared === true);
  return Response.json({ world: { id: world.id, shareCode: world.shareCode } });
});
