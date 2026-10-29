import { removeRelationship } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Remove a relationship between two of your characters. */
export const DELETE = route<{ relationshipId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await removeRelationship(db, actor, params.relationshipId);
  return new Response(null, { status: 204 });
});
