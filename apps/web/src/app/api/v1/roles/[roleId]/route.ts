import type { RoleInput } from '@worldroot/contracts';
import { deleteRole, updateRole } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Rename a role or change what it grants. */
export const PATCH = route<{ roleId: string }>(async ({ request, actor, params }) => {
  const input = (await readJson(request)) as unknown as RoleInput;
  const { db } = await database();
  await updateRole(db, actor, params.roleId, input);
  return new Response(null, { status: 204 });
});

/** Delete a custom role. */
export const DELETE = route<{ roleId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await deleteRole(db, actor, params.roleId);
  return new Response(null, { status: 204 });
});
