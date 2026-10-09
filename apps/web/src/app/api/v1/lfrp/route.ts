import { createListing } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Post a "Looking for RP" listing. */
export const POST = route(async ({ request, actor }) => {
  const input = await readJson(request);
  const { db } = await database();
  const listing = await createListing(db, actor, input);
  return Response.json({ listing: { id: listing.id } }, { status: 201 });
});
