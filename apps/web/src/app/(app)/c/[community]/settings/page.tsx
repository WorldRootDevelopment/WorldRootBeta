import { redirect } from 'next/navigation';
import { loadAdmin, settingsSections } from '@/features/community/admin/admin-view';
import { CommunitySettingsForm } from '@/features/community/admin/settings-form';

const heading = 'mb-6 font-serif text-2xl font-semibold tracking-tight text-ink';

export default async function GeneralSettingsPage({ params }: { params: Promise<{ community: string }> }) {
  const { community, holds } = await loadAdmin((await params).community);

  // Someone who can open other sections but not this one is sent to the first they can.
  if (!holds(['community.manage'])) {
    const first = settingsSections(community.slug).find((section) => holds(section.needs));
    redirect(first!.href);
  }

  return (
    <>
      <h2 className={heading}>General</h2>
      <CommunitySettingsForm
        community={{
          id: community.id,
          slug: community.slug,
          name: community.name,
          tagline: community.tagline,
          description: community.description,
          rules: community.rules,
          accentHue: community.accentHue,
          listed: community.listed,
          requireCharacterApproval: community.requireCharacterApproval,
        }}
      />
    </>
  );
}
