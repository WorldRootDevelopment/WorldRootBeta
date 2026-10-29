import { toggleKudos } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Give kudos to a story, or take them back. */
export const POST = route<{ storyId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  return Response.json({ kudos: await toggleKudos(db, actor, params.storyId) });
});
