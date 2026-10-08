import type { CreateProfileInput, UpdateProfileInput } from '@worldroot/contracts';
import { createProfile, updateProfile } from '@worldroot/core';
import { errorResponse, readJson, requireActor, route } from '@/lib/api';
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

/** Update the signed-in user's own profile. */
export const PATCH = route(async ({ request, actor }) => {
  const input = (await readJson(request)) as unknown as UpdateProfileInput;
  const { db } = await database();
  const profile = await updateProfile(db, actor, input);
  return Response.json({ profile });
});
