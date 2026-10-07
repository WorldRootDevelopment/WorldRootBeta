import { removeCharacterField } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Retire a field from the community character template. */
export const DELETE = route<{ fieldId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await removeCharacterField(db, actor, params.fieldId);
  return new Response(null, { status: 204 });
});
