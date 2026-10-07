import { createCommunitySchema } from '@worldroot/contracts';
import { createCommunity, parseInput } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Create a community. The signed-in user becomes its owner. */
export const POST = route(async ({ request, actor }) => {
  const values = parseInput(createCommunitySchema, await readJson(request));
  const { db } = await database();
  const community = await createCommunity(db, actor, {
    slug: values.slug,
    name: values.name,
    tagline: values.tagline ?? undefined,
    description: values.description ?? undefined,
    accentHue: values.accentHue,
    listed: values.listed,
  });
  return Response.json({ community: { id: community.id, slug: community.slug } }, { status: 201 });
});
