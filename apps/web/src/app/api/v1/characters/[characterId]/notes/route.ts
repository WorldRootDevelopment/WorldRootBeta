import { setCharacterNotes } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Save the notes about a character that only its player sees. */
export const PUT = route<{ characterId: string }>(async ({ request, actor, params }) => {
  const { notes } = await readJson(request);
  const { db } = await database();
  return Response.json({ notes: await setCharacterNotes(db, actor, params.characterId, notes) });
});
