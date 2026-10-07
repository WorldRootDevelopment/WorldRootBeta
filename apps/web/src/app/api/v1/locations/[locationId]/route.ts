import type { LocationInput } from '@worldroot/contracts';
import { updateLocation } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Update a location's details. */
export const PATCH = route<{ locationId: string }>(async ({ request, actor, params }) => {
  const input = (await readJson(request)) as unknown as LocationInput;
  const { db } = await database();
  const location = await updateLocation(db, actor, params.locationId, input);
  return Response.json({ location });
});
