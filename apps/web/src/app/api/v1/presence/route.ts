import { touchPresence } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Record that the signed-in user has WorldRoot open. Called once a minute by the app shell. */
export const POST = route(async ({ actor }) => {
  const { db } = await database();
  await touchPresence(db, actor);
  return new Response(null, { status: 204 });
});
