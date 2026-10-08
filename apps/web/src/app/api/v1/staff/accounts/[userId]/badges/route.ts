import { setBadge } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Give or take away a hand-granted badge. WorldRoot staff only. */
export const POST = route<{ userId: string }>(async ({ request, actor, params }) => {
  const { badge, granted } = await readJson(request);
  const { db } = await database();
  await setBadge(db, actor, params.userId, typeof badge === 'string' ? badge : '', granted === true);
  return new Response(null, { status: 204 });
});
