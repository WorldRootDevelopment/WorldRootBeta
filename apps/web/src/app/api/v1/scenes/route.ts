import type { SceneInput } from '@worldroot/contracts';
import { createScene } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Start a scene with its opening post. With a locationId it is a community scene, otherwise private. */
export const POST = route(async ({ request, actor }) => {
  const input = (await readJson(request)) as unknown as SceneInput;
  const { db } = await database();
  const scene = await createScene(db, actor, input);
  return Response.json({ scene: { id: scene.id } }, { status: 201 });
});
