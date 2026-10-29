import { setPremium } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Turn Heartwood on or off for an account. WorldRoot staff only. */
export const POST = route<{ userId: string }>(async ({ request, actor, params }) => {
  const { premium, months } = await readJson(request);
  const { db } = await database();
  await setPremium(db, actor, params.userId, premium === true, typeof months === 'number' ? months : null);
  return new Response(null, { status: 204 });
});
