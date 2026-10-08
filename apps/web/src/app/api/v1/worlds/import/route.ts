import { importSharedWorld } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Take a copy of a shared world into the signed-in user's library, by its world ID. */
export const POST = route(async ({ request, actor }) => {
  const { worldId } = await readJson(request);
  const { db } = await database();
  const world = await importSharedWorld(db, actor, typeof worldId === 'string' ? worldId : '');
  return Response.json({ world: { id: world.id } }, { status: 201 });
});
