import { setCommunityArchived } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Archive a community, or restore it. Owner only. */
export const POST = route<{ communityId: string }>(async ({ request, actor, params }) => {
  const { archived } = await readJson(request);
  const { db } = await database();
  const community = await setCommunityArchived(db, actor, params.communityId, archived === true);
  return Response.json({ community: { id: community.id, archived: Boolean(community.archivedAt) } });
});
