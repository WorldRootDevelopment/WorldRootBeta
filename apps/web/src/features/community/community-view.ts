import 'server-only';
import { getCommunityView } from '@worldroot/core';
import { cache } from 'react';
import { load } from '@/lib/load';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

/** The community for this request, as the viewer may see it. Shared by the layout and its pages. */
export const loadCommunity = cache(async (slug: string) => {
  const viewer = await requireViewer();
  const { db } = await database();
  const view = await load(() => getCommunityView(db, viewer.actor, slug));
  return { ...view, viewer, db };
});
