import { removeBanner, setBanner } from '@worldroot/core';
import { route } from '@/lib/api';
import { mediaStorage, readUpload } from '@/lib/media';
import { database } from '@/lib/server';

/** Set the banner across the top of your profile. The request body is the image itself. */
export const PUT = route(async ({ request, actor }) => {
  const upload = await readUpload(request);
  const { db } = await database();
  const stored = await setBanner(db, mediaStorage(), actor, upload);
  return Response.json({ media: { id: stored.id } });
});

/** Remove your profile banner. */
export const DELETE = route(async ({ actor }) => {
  const { db } = await database();
  await removeBanner(db, mediaStorage(), actor);
  return new Response(null, { status: 204 });
});
