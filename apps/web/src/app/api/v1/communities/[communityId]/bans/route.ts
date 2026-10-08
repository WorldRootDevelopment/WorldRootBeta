import { banMember, DomainError } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Ban someone from a community. */
export const POST = route<{ communityId: string }>(async ({ request, actor, params }) => {
  const { userId, reason } = await readJson(request);
  if (typeof userId !== 'string') throw new DomainError('invalid_input', 'Choose who to ban.');
  const { db } = await database();
  await banMember(db, actor, params.communityId, userId, typeof reason === 'string' ? reason : null);
  return new Response(null, { status: 204 });
});
