import { handleReport } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Close a report as resolved or dismissed. For the community's reviewers, or WorldRoot staff. */
export const POST = route<{ reportId: string }>(async ({ request, actor, params }) => {
  const { status, resolution } = await readJson(request);
  const { db } = await database();
  await handleReport(db, actor, params.reportId, { status, resolution });
  return new Response(null, { status: 204 });
});
