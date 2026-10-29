import { toggleReaction } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { publish } from '@/lib/live';
import { database } from '@/lib/server';

/** Add your reaction to a message, or take it away if you had added it. */
export const POST = route<{ messageId: string }>(async ({ request, actor, params }) => {
  const { emoji } = await readJson(request);
  const { db } = await database();
  const { conversationId, added } = await toggleReaction(db, actor, params.messageId, emoji);
  publish({ type: 'message.updated', conversationId });
  return Response.json({ added });
});
