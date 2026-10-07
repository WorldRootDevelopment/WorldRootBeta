import type { CharacterInput } from '@worldroot/contracts';
import { updateCharacter } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Update a character's profile. */
export const PATCH = route<{ characterId: string }>(async ({ request, actor, params }) => {
  const input = (await readJson(request)) as unknown as CharacterInput;
  const { db } = await database();
  const character = await updateCharacter(db, actor, params.characterId, input);
  return Response.json({ character });
});
