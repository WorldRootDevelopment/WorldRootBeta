import { addCharacterImage } from '@worldroot/core';
import { route } from '@/lib/api';
import { mediaStorage, readUpload } from '@/lib/media';
import { database } from '@/lib/server';

/** Add a picture to a character's gallery. The request body is the image itself. */
export const POST = route<{ characterId: string }>(async ({ request, actor, params }) => {
  const upload = await readUpload(request);
  const { db } = await database();
  const stored = await addCharacterImage(db, mediaStorage(), actor, params.characterId, upload);
  return Response.json({ media: { id: stored.id } }, { status: 201 });
});
