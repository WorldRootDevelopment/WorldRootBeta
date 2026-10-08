import { blockUser, unblockUser } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Block someone. */
export const POST = route<{ userId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await blockUser(db, actor, params.userId);
  return new Response(null, { status: 204 });
});

/** Unblock someone. */
export const DELETE = route<{ userId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await unblockUser(db, actor, params.userId);
  return new Response(null, { status: 204 });
});
