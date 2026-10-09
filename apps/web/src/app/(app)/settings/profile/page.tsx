import { getOwnProfileSettings } from '@worldroot/core';
import type { Metadata } from 'next';
import { ProfileForm } from '@/features/identity/profile-client';
import { SettingsTabs } from '@/features/identity/settings-tabs';
import { ImageUpload } from '@/features/media/image-upload';
import { PageHeader } from '@/features/shell/page-header';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Edit Profile' };

export default async function EditProfilePage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const { profile, hideOnline } = await getOwnProfileSettings(db, viewer.actor);

  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs />
      <p className="mb-6 mt-6 text-ink-muted">This is you, the writer. Your characters have profiles of their own.</p>
      <div className="mb-8 max-w-2xl">
        <ImageUpload url="/api/v1/profile/avatar" mediaId={profile.avatarId} name={profile.displayName} label="Profile Picture" />
      </div>
      <div className="mb-8 max-w-2xl">
        <ImageUpload url="/api/v1/profile/banner" mediaId={profile.bannerId} name={profile.displayName} label="Banner" shape="banner" />
      </div>
      <ProfileForm handle={profile.handle} displayName={profile.displayName} pronouns={profile.pronouns} bio={profile.bio} hideOnline={hideOnline} status={profile.status} accentHue={profile.accentHue} />
    </>
  );
}
