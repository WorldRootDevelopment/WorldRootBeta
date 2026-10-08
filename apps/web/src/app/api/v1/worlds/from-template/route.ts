import { createWorldFromTemplate } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Create a world in the signed-in user's library from a template. */
export const POST = route(async ({ request, actor }) => {
  const { templateId } = await readJson(request);
  const { db } = await database();
  const world = await createWorldFromTemplate(db, actor, typeof templateId === 'string' ? templateId : '');
  return Response.json({ world: { id: world.id } }, { status: 201 });
});
