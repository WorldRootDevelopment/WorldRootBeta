import { PERMISSION_KEYS, type PermissionKey } from '@worldroot/contracts';
import { listRoles } from '@worldroot/core';
import type { Metadata } from 'next';
import { requireSection } from '@/features/community/admin/admin-view';
import { RolesEditor } from '@/features/community/admin/roles-editor';

export const metadata: Metadata = { title: 'Roles' };

export default async function RolesPage({ params }: { params: Promise<{ community: string }> }) {
  const { community, admin, db } = await requireSection((await params).community, ['role.manage']);
  const roles = await listRoles(db, community.id);

  return (
    <>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Roles</h2>
      <p className="mb-6 mt-2 max-w-2xl text-ink-muted">
        A member can do everything allowed by any role they hold. Roles only ever add permissions, never take them away. You can change
        roles ranked below your own.
      </p>
      <RolesEditor
        communityId={community.id}
        grantable={admin.isOwner ? PERMISSION_KEYS : admin.permissions}
        roles={roles.map((role) => ({
          id: role.id,
          name: role.name,
          permissions: role.permissions as PermissionKey[],
          isOwner: role.isOwner,
          isDefault: role.isDefault,
          editable: !role.isOwner && role.position < admin.top,
        }))}
      />
    </>
  );
}
