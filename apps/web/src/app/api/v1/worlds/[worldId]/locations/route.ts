import type { LocationInput } from '@worldroot/contracts';
import { createLocation } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Add a location to a world, optionally inside another location. */
export const POST = route<{ worldId: string }>(async ({ request, actor, params }) => {
  const body = await readJson(request);
  const { name, summary, description } = body as unknown as LocationInput;
  const parentId = typeof body.parentId === 'string' ? body.parentId : null;
  const { db } = await database();
  const location = await createLocation(db, actor, params.worldId, { name, summary, description, parentId });
  return Response.json({ location }, { status: 201 });
});
