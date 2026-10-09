import { pingDatabase } from '@worldroot/core';
import { database } from '@/lib/server';

export const dynamic = 'force-dynamic';

/**
 * For the host's health check: answers 200 when the site is up and can reach
 * its database, 503 when it cannot. It says nothing else, so it is safe to
 * leave open.
 */
export async function GET() {
  try {
    const { db } = await database();
    await pingDatabase(db);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
