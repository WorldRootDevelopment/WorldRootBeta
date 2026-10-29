import { createCodeBatch } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Make a batch of redeem codes, one per line given. WorldRoot staff only. The codes are returned this once. */
export const POST = route(async ({ request, actor }) => {
  const input = await readJson(request);
  const { db } = await database();
  const codes = await createCodeBatch(db, actor, { batch: input.batch, references: input.references, grantsHeartwood: input.grantsHeartwood, grantsBadge: input.grantsBadge });
  return Response.json({ codes }, { status: 201, headers: { 'cache-control': 'no-store' } });
});
