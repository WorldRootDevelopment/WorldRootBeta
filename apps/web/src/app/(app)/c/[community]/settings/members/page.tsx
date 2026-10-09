import { listBans, listMembers, listRoles } from '@worldroot/core';
import type { Metadata } from 'next';
import { requireSection } from '@/features/community/admin/admin-view';
import { MembersTable } from '@/features/community/admin/members-table';

export const metadata: Metadata = { title: 'Members' };

export default async function MembersPage({ params }: { params: Promise<{ community: string }> }) {
  const { community, admin, holds, viewer, db } = await requireSection((await params).community, ['role.manage', 'member.kick', 'member.ban']);
  const [members, roles, bans] = await Promise.all([
    listMembers(db, community.id),
    listRoles(db, community.id),
    listBans(db, viewer.actor, community.id),
  ]);

  return (
    <>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Members</h2>
      <p className="mb-6 mt-2 text-ink-muted">
        {members.length} {members.length === 1 ? 'member' : 'members'}, highest-ranked first.
      </p>
      <MembersTable
        communityId={community.id}
        members={members}
        assignable={roles.filter((role) => !role.isDefault && role.position < admin.top).map(({ id, name }) => ({ id, name }))}
        viewerId={viewer.actor.userId}
        viewerTop={admin.top}
        canAssign={holds(['role.manage'])}
        canRemove={holds(['member.kick'])}
        canBan={holds(['member.ban'])}
        bans={bans}
      />
    </>
  );
}
