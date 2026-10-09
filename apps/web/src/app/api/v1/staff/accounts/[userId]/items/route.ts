import { setItemOwned } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Give someone a store item, or take it back. WorldRoot staff only. */
export const POST = route<{ userId: string }>(async ({ request, actor, params }) => {
  const { item, owned } = await readJson(request);
  const { db } = await database();
  await setItemOwned(db, actor, params.userId, typeof item === 'string' ? item : '', owned === true);
  return new Response(null, { status: 204 });
});
