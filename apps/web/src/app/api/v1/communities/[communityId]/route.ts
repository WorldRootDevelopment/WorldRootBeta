import type { CommunitySettingsInput } from '@worldroot/contracts';
import { updateCommunity } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Update a community's details and settings. */
export const PATCH = route<{ communityId: string }>(async ({ request, actor, params }) => {
  const input = (await readJson(request)) as unknown as CommunitySettingsInput;
  const { db } = await database();
  const community = await updateCommunity(db, actor, params.communityId, input);
  return Response.json({ community: { id: community.id, slug: community.slug } });
});
