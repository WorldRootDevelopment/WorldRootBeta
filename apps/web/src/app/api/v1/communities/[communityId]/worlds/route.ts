import { copyWorldToCommunity } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Give a community its own copy of one of the signed-in user's library worlds. */
export const POST = route<{ communityId: string }>(async ({ request, actor, params }) => {
  const { worldId } = await readJson(request);
  const { db } = await database();
  const world = await copyWorldToCommunity(db, actor, typeof worldId === 'string' ? worldId : '', params.communityId);
  return Response.json({ world: { id: world.id, slug: world.slug } }, { status: 201 });
});
