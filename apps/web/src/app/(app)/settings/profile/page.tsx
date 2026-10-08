import { getOwnProfileSettings } from '@worldroot/core';
import type { Metadata } from 'next';
import { ProfileForm } from '@/features/identity/profile-client';
import { SettingsTabs } from '@/features/identity/settings-tabs';
import { PageHeader } from '@/features/shell/page-header';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Edit profile' };

export default async function EditProfilePage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const { profile, hideOnline } = await getOwnProfileSettings(db, viewer.actor);

  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs />
      <p className="mb-6 mt-6 text-ink-muted">This is you, the writer. Your characters have profiles of their own.</p>
      <ProfileForm handle={profile.handle} displayName={profile.displayName} pronouns={profile.pronouns} bio={profile.bio} hideOnline={hideOnline} />
    </>
  );
}
