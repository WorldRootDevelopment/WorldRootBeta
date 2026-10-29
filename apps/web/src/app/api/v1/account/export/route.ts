import { exportAccountData } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Download everything you have made on WorldRoot, as one file. */
export const GET = route(async ({ actor }) => {
  const { db } = await database();
  const data = await exportAccountData(db, actor);
  const day = data.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="worldroot-${day}.json"`,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
});
