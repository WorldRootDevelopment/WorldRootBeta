import { assignRole, unassignRole } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

type Params = { communityId: string; userId: string; roleId: string };

/** Give a member a role. */
export const PUT = route<Params>(async ({ actor, params }) => {
  const { db } = await database();
  await assignRole(db, actor, params.roleId, params.userId);
  return new Response(null, { status: 204 });
});

/** Take a role away from a member. */
export const DELETE = route<Params>(async ({ actor, params }) => {
  const { db } = await database();
  await unassignRole(db, actor, params.roleId, params.userId);
  return new Response(null, { status: 204 });
});
