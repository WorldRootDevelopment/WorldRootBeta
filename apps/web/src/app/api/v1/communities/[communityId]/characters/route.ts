import { addCharacterToCommunity } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Give a community its own copy of one of the signed-in user's library characters. */
export const POST = route<{ communityId: string }>(async ({ request, actor, params }) => {
  const body = await readJson(request);
  const customValues: Record<string, string> = {};
  if (body.customValues && typeof body.customValues === 'object') {
    for (const [key, value] of Object.entries(body.customValues)) if (typeof value === 'string') customValues[key] = value.trim();
  }
  const { db } = await database();
  const character = await addCharacterToCommunity(db, actor, typeof body.characterId === 'string' ? body.characterId : '', params.communityId, {
    customValues,
  });
  return Response.json({ character: { id: character.id } }, { status: 201 });
});
