import { listChannelsForAdmin, listRoles } from '@worldroot/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadAdmin } from '@/features/community/admin/admin-view';
import { ChannelsAdmin } from '@/features/community/admin/channels-admin';
import { load } from '@/lib/load';

export const metadata: Metadata = { title: 'Channels' };

const heading = 'mb-2 font-display text-2xl font-semibold tracking-tight text-ink';

/** Manage a community's chat channels. For whoever holds "Manage community". */
export default async function ChannelSettingsPage({ params }: { params: Promise<{ community: string }> }) {
  const { community, holds, viewer, db } = await loadAdmin((await params).community);
  if (!holds(['community.manage'])) notFound();
  const [channels, roles] = await Promise.all([load(() => listChannelsForAdmin(db, viewer.actor, community.id)), listRoles(db, community.id)]);

  return (
    <>
      <h2 className={heading}>Channels</h2>
      <p className="mb-8 max-w-2xl text-ink-muted">
        The rooms in this community&rsquo;s Chat. The first one in the list is where people land. A channel can be kept private to some
        roles, or open to read but written in by only a few.
      </p>
      {community.archivedAt ? (
        <p role="status" className="rounded-lg bg-surface-sunken px-4 py-3 text-sm text-ink">
          This community is archived, so its channels cannot be changed.
        </p>
      ) : (
        <ChannelsAdmin
          communityId={community.id}
          channels={channels.map(({ id, name, topic, category, readRoleIds, postRoleIds }) => ({ id, name, topic, category, readRoleIds, postRoleIds }))}
          // The Owner role always sees and posts everywhere, so there is nothing to tick for it.
          roles={roles.filter((role) => !role.isOwner).map((role) => ({ id: role.id, name: role.name }))}
        />
      )}
    </>
  );
}
