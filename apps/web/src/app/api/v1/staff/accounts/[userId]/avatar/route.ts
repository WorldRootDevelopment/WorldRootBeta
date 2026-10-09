import { removeAvatar } from '@worldroot/core';
import { route } from '@/lib/api';
import { mediaStorage } from '@/lib/media';
import { database } from '@/lib/server';

/** Remove someone's profile picture. WorldRoot staff only. */
export const DELETE = route<{ userId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await removeAvatar(db, mediaStorage(), actor, params.userId);
  return new Response(null, { status: 204 });
});
