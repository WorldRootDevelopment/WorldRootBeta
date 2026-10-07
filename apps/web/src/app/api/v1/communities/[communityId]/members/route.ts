import { joinCommunity } from '@worldroot/core';
import { errorResponse, requireActor } from '@/lib/api';
import { database } from '@/lib/server';

/** Join a listed community as the signed-in user. */
export async function POST(request: Request, { params }: { params: Promise<{ communityId: string }> }) {
  try {
    const actor = await requireActor(request);
    const { communityId } = await params;
    const { db } = await database();
    await joinCommunity(db, actor, communityId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
