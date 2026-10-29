import { setCharacterShared } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Share a library character so anyone signed in can see it, or make it private again. */
export const PUT = route<{ characterId: string }>(async ({ request, actor, params }) => {
  const { shared } = await readJson(request);
  const { db } = await database();
  await setCharacterShared(db, actor, params.characterId, shared === true);
  return Response.json({ shared: shared === true });
});
