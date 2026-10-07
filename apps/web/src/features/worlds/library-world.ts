import 'server-only';
import { getLibraryWorld, listLocations } from '@worldroot/core';
import { cache } from 'react';
import { load } from '@/lib/load';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

/** A world from the viewer's own library, with its locations. Shared by the library world pages. */
export const loadLibraryWorld = cache(async (worldId: string) => {
  const viewer = await requireViewer();
  const { db } = await database();
  const world = await load(() => getLibraryWorld(db, viewer.actor, worldId));
  return { world, locations: await listLocations(db, world.id) };
});
