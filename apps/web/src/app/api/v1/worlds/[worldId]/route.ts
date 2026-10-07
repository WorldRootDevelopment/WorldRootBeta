import type { WorldInput } from '@worldroot/contracts';
import { updateWorld } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Update a world's details. */
export const PATCH = route<{ worldId: string }>(async ({ request, actor, params }) => {
  const input = (await readJson(request)) as unknown as WorldInput;
  const { db } = await database();
  const world = await updateWorld(db, actor, params.worldId, input);
  return Response.json({ world });
});
