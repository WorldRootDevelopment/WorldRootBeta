import 'server-only';
import type { Profile } from '@worldroot/contracts';
import { getProfile, getSuspension, isDemoGuest, type Actor } from '@worldroot/core';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { database, getAuth } from './server';

export interface Viewer {
  actor: Actor;
  email: string;
  /** Null until onboarding is complete. */
  profile: Profile | null;
  /** The shared guest account, which anyone can sign in to. It may write in the demo and little else. */
  demoGuest: boolean;
  /** Set while WorldRoot staff have suspended this account. */
  suspended: { since: Date; reason: string | null } | null;
}

/** The signed-in viewer for this request, or null. Resolved once per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { db } = await database();
  return {
    actor: { userId: session.user.id, platformRole: session.user.platformRole === 'staff' ? 'staff' : 'user' },
    email: session.user.email,
    demoGuest: isDemoGuest(session.user.email),
    profile: await getProfile(db, session.user.id),
    suspended: await getSuspension(db, session.user.id),
  };
});

/** For pages inside the app: sends signed-out visitors to sign in and new accounts to onboarding. */
export async function requireViewer(): Promise<Viewer & { profile: Profile }> {
  const viewer = await getViewer();
  if (!viewer) redirect('/sign-in');
  // A suspended account sees one page, which says so.
  if (viewer.suspended) redirect('/suspended');
  if (!viewer.profile) redirect('/welcome');
  return viewer as Viewer & { profile: Profile };
}
