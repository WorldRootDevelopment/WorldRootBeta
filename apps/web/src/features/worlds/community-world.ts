import 'server-only';
import { getCommunityWorld, listLocations, worldPowers } from '@worldroot/core';
import { cache } from 'react';
import { loadCommunity } from '@/features/community/community-view';
import { load } from '@/lib/load';

/**
 * A community's copy of a world, with its locations and what the viewer may
 * change about it. Shared by the community's world pages, so each shows only
 * the controls that will work for the person looking.
 */
export const loadCommunityWorld = cache(async (communitySlug: string, worldSlug: string) => {
  const { community, permissions, viewer, db } = await loadCommunity(communitySlug);
  const world = await load(() => getCommunityWorld(db, community.id, worldSlug));
  const [locations, powers] = await Promise.all([listLocations(db, world.id), worldPowers(db, viewer.actor, world)]);
  return { community, permissions, world, locations, powers, db, base: `/c/${community.slug}/worlds/${world.slug}` };
});
