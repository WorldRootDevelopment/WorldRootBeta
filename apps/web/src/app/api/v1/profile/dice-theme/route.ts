import { setDiceTheme } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Choose how your dice look. Only themes that are free to use can be chosen. */
export const PUT = route(async ({ request, actor }) => {
  const { theme } = await readJson(request);
  const { db } = await database();
  const chosen = await setDiceTheme(db, actor, theme);
  return Response.json({ theme: chosen });
});
