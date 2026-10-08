import { revokeInvite } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Stop an invite link working. */
export const DELETE = route<{ inviteId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await revokeInvite(db, actor, params.inviteId);
  return new Response(null, { status: 204 });
});
