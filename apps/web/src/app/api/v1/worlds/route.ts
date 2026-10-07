import type { WorldInput } from '@worldroot/contracts';
import { createWorld } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Create a world in the signed-in user's library. Its address is derived from its name. */
export const POST = route(async ({ request, actor }) => {
  const { name, summary, description } = (await readJson(request)) as unknown as WorldInput;
  const { db } = await database();
  const world = await createWorld(db, actor, { name, summary, description });
  return Response.json({ world }, { status: 201 });
});
