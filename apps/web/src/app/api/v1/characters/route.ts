import type { CharacterInput } from '@worldroot/contracts';
import { createCharacter } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Create a character in the signed-in user's library. */
export const POST = route(async ({ request, actor }) => {
  const input = (await readJson(request)) as unknown as CharacterInput;
  const { db } = await database();
  const character = await createCharacter(db, actor, input);
  return Response.json({ character }, { status: 201 });
});
