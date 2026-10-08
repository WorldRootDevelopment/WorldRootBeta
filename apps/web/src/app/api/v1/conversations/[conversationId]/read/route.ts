import { markConversationRead } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Record that the signed-in reader is up to date in a conversation. */
export const POST = route<{ conversationId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await markConversationRead(db, actor, params.conversationId);
  return new Response(null, { status: 204 });
});
