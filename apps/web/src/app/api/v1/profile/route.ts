import type { CreateProfileInput } from '@worldroot/contracts';
import { createProfile } from '@worldroot/core';
import { errorResponse, readJson, requireActor } from '@/lib/api';
import { database } from '@/lib/server';

/** Onboarding: create the signed-in user's profile. The service validates the input. */
export async function POST(request: Request) {
  try {
    const actor = await requireActor(request);
    const input = (await readJson(request)) as unknown as CreateProfileInput;
    const { db } = await database();
    const profile = await createProfile(db, actor, input);
    return Response.json({ profile }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
