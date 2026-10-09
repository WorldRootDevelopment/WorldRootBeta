import { ProfileContent } from '@/features/identity/profile-content';
import { ProfilePopup } from '@/features/identity/profile-popup';

/**
 * Clicking a link to someone's profile from inside the app lands here, not on
 * the profile page: the profile opens in a pop-up over wherever the person
 * was. Opening the address directly, or refreshing, shows the full page.
 */
export default async function ProfilePopupPage({ params }: { params: Promise<{ handle: string }> }) {
  const handle = decodeURIComponent((await params).handle);
  return (
    <ProfilePopup handle={handle}>
      <ProfileContent handle={handle} popup />
    </ProfilePopup>
  );
}
