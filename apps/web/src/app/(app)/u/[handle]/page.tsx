import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { loadProfile, ProfileContent } from '@/features/identity/profile-content';

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { profile } = await loadProfile((await params).handle);
  return { title: `${profile.displayName} (@${profile.handle})` };
}

/**
 * The full profile page. Clicking a name inside the app opens the same
 * content in a pop-up instead (see `@modal/(.)u/[handle]`); this page is what
 * a link opened directly, or a refresh, shows.
 */
export default async function ProfilePage({ params }: Props) {
  const requested = decodeURIComponent((await params).handle);
  const { profile } = await loadProfile(requested);
  // Someone who has changed their handle is still found by the old one, and sent on to the new.
  if (requested.toLowerCase() !== profile.handle.toLowerCase()) redirect(`/u/${profile.handle}`);
  return <ProfileContent handle={requested} />;
}
