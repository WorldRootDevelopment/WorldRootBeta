import { removeListing } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Take a listing down. Its author, or WorldRoot staff. */
export const DELETE = route<{ listingId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await removeListing(db, actor, params.listingId);
  return new Response(null, { status: 204 });
});
