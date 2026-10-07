import type { CharacterFieldInput } from '@worldroot/contracts';
import { createCharacterField } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Add a field to the community character template. */
export const POST = route<{ communityId: string }>(async ({ request, actor, params }) => {
  const input = (await readJson(request)) as unknown as CharacterFieldInput;
  const { db } = await database();
  const field = await createCharacterField(db, actor, params.communityId, input);
  return Response.json({ field: { id: field.id } }, { status: 201 });
});
