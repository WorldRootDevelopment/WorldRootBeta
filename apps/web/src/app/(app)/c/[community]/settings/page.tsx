import { redirect } from 'next/navigation';
import { loadAdmin, settingsSections } from '@/features/community/admin/admin-view';
import { DangerZone } from '@/features/community/admin/danger-zone';
import { CommunitySettingsForm } from '@/features/community/admin/settings-form';

const heading = 'mb-6 font-display text-2xl font-semibold tracking-tight text-ink';

export default async function GeneralSettingsPage({ params }: { params: Promise<{ community: string }> }) {
  const { community, admin, holds } = await loadAdmin((await params).community);
  const archived = Boolean(community.archivedAt);

  // Someone who can open other sections but not this one is sent to the first they can.
  if (!holds(['community.manage']) && !admin.isOwner) {
    const first = settingsSections(community.slug).find((section) => holds(section.needs));
    redirect(first!.href);
  }

  return (
    <>
      <h2 className={heading}>General</h2>
      {archived ? (
        <p className="max-w-2xl text-ink-muted">
          This community is archived, so its settings cannot be changed. Restore it to make changes, or delete it below.
        </p>
      ) : holds(['community.manage']) ? (
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
            dndMode: community.dndMode,
          }}
        />
      ) : null}
      {/* Archiving and deleting belong to the owner alone, whatever other roles hold. */}
      {admin.isOwner ? <DangerZone communityId={community.id} communityName={community.name} archived={archived} /> : null}
    </>
  );
}
