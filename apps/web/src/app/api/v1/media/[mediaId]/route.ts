import { readMedia } from '@worldroot/core';
import { route } from '@/lib/api';
import { mediaStorage } from '@/lib/media';
import { database } from '@/lib/server';

/** Serve an uploaded image to a signed-in person. */
export const GET = route<{ mediaId: string }>(async ({ params }) => {
  const { db } = await database();
  const { contentType, bytes } = await readMedia(db, mediaStorage(), params.mediaId);
  return new Response(Buffer.from(bytes), {
    headers: {
      'content-type': contentType,
      // An image's id never points at different bytes, so a browser may keep it.
      'cache-control': 'private, max-age=31536000, immutable',
      // The browser must treat this as the image it was checked to be, and as nothing that can run.
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
      'content-disposition': 'inline',
    },
  });
});
