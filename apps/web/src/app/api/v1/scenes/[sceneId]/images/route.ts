import { uploadSceneImage } from '@worldroot/core';
import { route } from '@/lib/api';
import { mediaStorage, readUpload } from '@/lib/media';
import { database } from '@/lib/server';

/**
 * Upload a picture to attach to a post in this scene. The request body is the
 * image itself. It is not shown until a post names it.
 */
export const POST = route<{ sceneId: string }>(async ({ request, actor, params }) => {
  const upload = await readUpload(request);
  const { db } = await database();
  const stored = await uploadSceneImage(db, mediaStorage(), actor, params.sceneId, upload);
  return Response.json({ media: { id: stored.id } }, { status: 201 });
});
