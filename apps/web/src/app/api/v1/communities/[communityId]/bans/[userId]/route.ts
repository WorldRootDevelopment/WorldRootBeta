import { unbanMember } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Lift a ban. */
export const DELETE = route<{ communityId: string; userId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await unbanMember(db, actor, params.communityId, params.userId);
  return new Response(null, { status: 204 });
});
