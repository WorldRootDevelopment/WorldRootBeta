import type { CommunitySettingsInput } from '@worldroot/contracts';
import { deleteCommunity, updateCommunity } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Update a community's details and settings. */
export const PATCH = route<{ communityId: string }>(async ({ request, actor, params }) => {
  const input = (await readJson(request)) as unknown as CommunitySettingsInput;
  const { db } = await database();
  const community = await updateCommunity(db, actor, params.communityId, input);
  return Response.json({ community: { id: community.id, slug: community.slug } });
});

/** Delete a community for good. Owner only, and the request must repeat the community's name. */
export const DELETE = route<{ communityId: string }>(async ({ request, actor, params }) => {
  const { confirmName } = await readJson(request);
  const { db } = await database();
  await deleteCommunity(db, actor, params.communityId, typeof confirmName === 'string' ? confirmName : '');
  return new Response(null, { status: 204 });
});
