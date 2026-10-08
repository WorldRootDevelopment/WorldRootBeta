import { startConversation } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Start a conversation with one or more people, by handle. One person gives the pair's single direct conversation. */
export const POST = route(async ({ request, actor }) => {
  const body = await readJson(request);
  const handles = typeof body.handles === 'string' ? body.handles.split(/[\s,]+/) : [];
  const { db } = await database();
  const conversation = await startConversation(db, actor, { handles, title: typeof body.title === 'string' ? body.title : null });
  return Response.json({ conversation: { id: conversation.id } }, { status: 201 });
});
