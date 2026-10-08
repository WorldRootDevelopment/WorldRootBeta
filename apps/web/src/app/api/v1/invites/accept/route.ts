import { acceptInvite } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Join a community with an invite code. */
export const POST = route(async ({ request, actor }) => {
  const { code } = await readJson(request);
  const { db } = await database();
  const community = await acceptInvite(db, actor, typeof code === 'string' ? code : '');
  return Response.json({ community });
});
