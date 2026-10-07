import type { RoleInput } from '@worldroot/contracts';
import { createManagedRole } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Create a role in a community. */
export const POST = route<{ communityId: string }>(async ({ request, actor, params }) => {
  const input = (await readJson(request)) as unknown as RoleInput;
  const { db } = await database();
  const role = await createManagedRole(db, actor, params.communityId, input);
  return Response.json({ role: { id: role.id } }, { status: 201 });
});
