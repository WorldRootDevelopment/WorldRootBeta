import { removePortrait, setPortrait } from '@worldroot/core';
import { route } from '@/lib/api';
import { mediaStorage, readUpload } from '@/lib/media';
import { database } from '@/lib/server';

/** Set a character's portrait. The request body is the image itself. */
export const PUT = route<{ characterId: string }>(async ({ request, actor, params }) => {
  const upload = await readUpload(request);
  const { db } = await database();
  const stored = await setPortrait(db, mediaStorage(), actor, params.characterId, upload);
  return Response.json({ media: { id: stored.id } });
});

/** Remove a character's portrait. */
export const DELETE = route<{ characterId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await removePortrait(db, mediaStorage(), actor, params.characterId);
  return new Response(null, { status: 204 });
});
