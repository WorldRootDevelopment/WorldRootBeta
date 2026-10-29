import { removeComment } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Remove a comment: your own, any on your story, or any at all for staff. */
export const DELETE = route<{ commentId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await removeComment(db, actor, params.commentId);
  return new Response(null, { status: 204 });
});
