import { restoreAccount, suspendAccount } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Suspend an account, with a reason, or restore it. WorldRoot staff only. */
export const POST = route<{ userId: string }>(async ({ request, actor, params }) => {
  const { suspended, reason } = await readJson(request);
  const { db } = await database();
  if (suspended === true) await suspendAccount(db, actor, params.userId, reason);
  else await restoreAccount(db, actor, params.userId);
  return new Response(null, { status: 204 });
});
