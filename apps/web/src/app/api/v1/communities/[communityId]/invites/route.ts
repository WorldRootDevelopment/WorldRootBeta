import { createInvite } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

const optionalNumber = (value: unknown) => (typeof value === 'number' ? value : null);

/** Create an invite link for a community. */
export const POST = route<{ communityId: string }>(async ({ request, actor, params }) => {
  const body = await readJson(request);
  const { db } = await database();
  const invite = await createInvite(db, actor, params.communityId, {
    maxUses: optionalNumber(body.maxUses),
    expiresInDays: optionalNumber(body.expiresInDays),
  });
  return Response.json({ invite: { id: invite.id, code: invite.code } }, { status: 201 });
});
