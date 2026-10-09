import { signOutAccount } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Sign an account out of every device. WorldRoot staff only. */
export const DELETE = route<{ userId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  const ended = await signOutAccount(db, actor, params.userId);
  return Response.json({ ended });
});
