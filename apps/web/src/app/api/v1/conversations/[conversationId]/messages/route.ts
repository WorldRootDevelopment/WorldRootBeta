import { sendMessage } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { publish } from '@/lib/live';
import { database } from '@/lib/server';

/** Send a message to a conversation or community space. */
export const POST = route<{ conversationId: string }>(async ({ request, actor, params }) => {
  const { body } = await readJson(request);
  const { db } = await database();
  const message = await sendMessage(db, actor, params.conversationId, body);
  publish({ type: 'message.created', conversationId: params.conversationId });
  return Response.json({ message: { id: message.id } }, { status: 201 });
});
