import { setSiteTheme } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Choose how WorldRoot looks for you. Themes other than the default come with Heartwood. */
export const PUT = route(async ({ request, actor }) => {
  const { theme } = await readJson(request);
  const { db } = await database();
  const chosen = await setSiteTheme(db, actor, theme);
  return Response.json({ theme: chosen });
});
