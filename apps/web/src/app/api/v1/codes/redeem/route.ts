import { redeemCode } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Redeem a code, such as the one sent to Kickstarter backers. */
export const POST = route(async ({ request, actor }) => {
  const { code } = await readJson(request);
  const { db } = await database();
  return Response.json({ redeemed: await redeemCode(db, actor, code) });
});
