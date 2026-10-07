import { removeMember } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Remove a member from a community. */
export const DELETE = route<{ communityId: string; userId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await removeMember(db, actor, params.communityId, params.userId);
  return new Response(null, { status: 204 });
});
