import { DomainError, reviewCharacter } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Approve a community character for play, or return it to its player. */
export const POST = route<{ characterId: string }>(async ({ request, actor, params }) => {
  const { decision } = await readJson(request);
  if (decision !== 'approved' && decision !== 'returned') throw new DomainError('invalid_input', 'Choose approve or return.');
  const { db } = await database();
  await reviewCharacter(db, actor, params.characterId, decision);
  return new Response(null, { status: 204 });
});
