import { removeCharacterImage } from '@worldroot/core';
import { route } from '@/lib/api';
import { mediaStorage } from '@/lib/media';
import { database } from '@/lib/server';

/** Take a picture out of a character's gallery. */
export const DELETE = route<{ characterId: string; mediaId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await removeCharacterImage(db, mediaStorage(), actor, params.characterId, params.mediaId);
  return new Response(null, { status: 204 });
});
