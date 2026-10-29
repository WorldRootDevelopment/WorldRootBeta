import { removeUpload } from '@worldroot/core';
import { route } from '@/lib/api';
import { mediaStorage } from '@/lib/media';
import { database } from '@/lib/server';

/** Take a picture off the site, wherever it is shown. WorldRoot staff only. */
export const DELETE = route<{ mediaId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await removeUpload(db, mediaStorage(), actor, params.mediaId);
  return new Response(null, { status: 204 });
});
