import { removeMessage } from '@worldroot/core';
import { route } from '@/lib/api';
import { publish } from '@/lib/live';
import { database } from '@/lib/server';

/** Remove a message, leaving a marker in its place. */
export const DELETE = route<{ messageId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  const { conversationId } = await removeMessage(db, actor, params.messageId);
  publish({ type: 'message.updated', conversationId });
  return new Response(null, { status: 204 });
});
