import { addRelationship } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Say how this character is related to another of yours. */
export const POST = route<{ characterId: string }>(async ({ request, actor, params }) => {
  const { otherId, label } = await readJson(request);
  const { db } = await database();
  return Response.json({ relationship: await addRelationship(db, actor, params.characterId, otherId, label) }, { status: 201 });
});
