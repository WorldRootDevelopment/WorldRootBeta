import { setSeason } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Change the look the whole site wears. WorldRoot staff only. */
export const PUT = route(async ({ request, actor }) => {
  const { season } = await readJson(request);
  const { db } = await database();
  return Response.json({ season: await setSeason(db, actor, season) });
});
