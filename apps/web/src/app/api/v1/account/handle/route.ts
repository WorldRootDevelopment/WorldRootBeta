import { changeHandle } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Change the signed-in user's handle. */
export const PATCH = route(async ({ request, actor }) => {
  const { handle } = await readJson(request);
  const { db } = await database();
  const profile = await changeHandle(db, actor, handle);
  return Response.json({ profile });
});
