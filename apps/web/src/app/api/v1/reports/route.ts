import { createReport } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Report a post, message, profile or character. */
export const POST = route(async ({ request, actor }) => {
  const { targetType, targetId, category, note } = await readJson(request);
  const { db } = await database();
  const report = await createReport(db, actor, { targetType, targetId, category, note });
  return Response.json({ report: { id: report.id } }, { status: 201 });
});
