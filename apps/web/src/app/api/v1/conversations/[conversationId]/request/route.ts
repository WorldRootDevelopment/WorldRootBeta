import { acceptRequest, declineRequest, DomainError } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Answer a message request: accept or decline. */
export const POST = route<{ conversationId: string }>(async ({ request, actor, params }) => {
  const { action } = await readJson(request);
  const { db } = await database();
  if (action === 'accept') await acceptRequest(db, actor, params.conversationId);
  else if (action === 'decline') await declineRequest(db, actor, params.conversationId);
  else throw new DomainError('invalid_input', 'Choose accept or decline.');
  return new Response(null, { status: 204 });
});
