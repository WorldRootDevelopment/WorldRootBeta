import { acceptFriendRequest, removeFriend } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Accept the friend request this person sent you. */
export const POST = route<{ userId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await acceptFriendRequest(db, actor, params.userId);
  return new Response(null, { status: 204 });
});

/** Decline their request, cancel your own, or stop being friends. */
export const DELETE = route<{ userId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await removeFriend(db, actor, params.userId);
  return new Response(null, { status: 204 });
});
