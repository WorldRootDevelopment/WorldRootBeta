import { markNotificationsRead } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Mark one notification read, or all of them when no id is given. */
export const POST = route(async ({ request, actor }) => {
  const { id } = await readJson(request);
  const { db } = await database();
  await markNotificationsRead(db, actor, typeof id === 'string' ? id : undefined);
  return new Response(null, { status: 204 });
});
