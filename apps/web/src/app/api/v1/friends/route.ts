import { sendFriendRequest } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Ask someone to be friends, by handle. If they have already asked you, this accepts. */
export const POST = route(async ({ request, actor }) => {
  const { handle } = await readJson(request);
  const { db } = await database();
  const state = await sendFriendRequest(db, actor, handle);
  return Response.json({ state }, { status: 201 });
});
