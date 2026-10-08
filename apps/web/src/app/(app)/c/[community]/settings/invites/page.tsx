import { listInvites } from '@worldroot/core';
import type { Metadata } from 'next';
import { requireSection } from '@/features/community/admin/admin-view';
import { InvitesPanel } from '@/features/community/admin/invites-panel';

export const metadata: Metadata = { title: 'Invites' };

export default async function InvitesPage({ params }: { params: Promise<{ community: string }> }) {
  const { community, viewer, db } = await requireSection((await params).community, ['community.invite']);
  const invites = await listInvites(db, viewer.actor, community.id);

  return (
    <>
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">Invites</h2>
      <p className="mb-6 mt-2 max-w-2xl text-ink-muted">
        {community.listed
          ? 'This community is listed, so anyone can find and join it. Invite links are a quick way to bring a particular person straight here.'
          : 'This community is unlisted. An invite link is the only way in, so share links only with people you want here.'}
      </p>
      <InvitesPanel communityId={community.id} invites={invites} />
    </>
  );
}
