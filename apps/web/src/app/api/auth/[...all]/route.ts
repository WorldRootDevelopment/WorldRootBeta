import { isDemoGuest } from '@worldroot/core';
import { getAuth } from '@/lib/server';

/**
 * The only account requests the shared guest account may make. Anyone at all
 * can be signed in to it, so it must not be able to change its password or
 * email, connect or remove a sign-in method, sign other people out, or delete
 * itself: any of those would take the account away from everyone else.
 */
const GUEST_MAY = /\/(sign-out|sign-in\/[^/]+|sign-up\/[^/]+|callback\/[^/]+)$/;

const handle = async (request: Request) => {
  const auth = await getAuth();
  if (request.method !== 'GET' && !GUEST_MAY.test(new URL(request.url).pathname)) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (session && isDemoGuest(session.user.email)) {
      return Response.json({ code: 'FORBIDDEN', message: 'The shared demo account cannot change its own settings. Create your own free account for that.' }, { status: 403 });
    }
  }
  return auth.handler(request);
};

export { handle as GET, handle as POST };
