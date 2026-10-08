import { copyWorldToCommunity, DomainError } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/**
 * Give a community its own copy of a world: one of the signed-in user's library
 * worlds (worldId), or a world someone shared by ID (shareCode). Either way the
 * caller must hold "Add worlds" in the community.
 */
export const POST = route<{ communityId: string }>(async ({ request, actor, params }) => {
  const { worldId, shareCode } = await readJson(request);
  const from =
    typeof shareCode === 'string' && shareCode.trim()
      ? { shareCode }
      : typeof worldId === 'string' && worldId
        ? { worldId }
        : null;
  if (!from) throw new DomainError('invalid_input', 'Choose a world or enter a world ID.', { fields: { worldId: 'Choose a world or enter a world ID.' } });
  const { db } = await database();
  const world = await copyWorldToCommunity(db, actor, from, params.communityId);
  return Response.json({ world: { id: world.id, slug: world.slug, name: world.name } }, { status: 201 });
});
