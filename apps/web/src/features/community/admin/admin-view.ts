import 'server-only';
import type { PermissionKey } from '@worldroot/contracts';
import { ADMIN_PERMISSIONS, getAdminView } from '@worldroot/core';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { loadCommunity } from '../community-view';

export interface SettingsSection {
  href: string;
  label: string;
  /** Holding any one of these opens the section. */
  needs: PermissionKey[];
}

export const settingsSections = (slug: string): SettingsSection[] => [
  { href: `/c/${slug}/settings`, label: 'General', needs: ['community.manage'] },
  { href: `/c/${slug}/settings/roles`, label: 'Roles', needs: ['role.manage'] },
  { href: `/c/${slug}/settings/members`, label: 'Members', needs: ['role.manage', 'member.kick', 'member.ban'] },
  { href: `/c/${slug}/settings/invites`, label: 'Invites', needs: ['community.invite'] },
  { href: `/c/${slug}/settings/characters`, label: 'Characters', needs: ['characterfield.manage', 'character.approve'] },
  { href: `/c/${slug}/settings/reports`, label: 'Reports', needs: ['report.review'] },
  { href: `/c/${slug}/settings/audit`, label: 'Audit log', needs: ['auditlog.view'] },
];

/**
 * The community and the viewer's standing in it, for the settings pages. 404s for anyone with no admin
 * permission. The owner always gets in: an archived community grants no permissions, and they must still reach it.
 */
export const loadAdmin = cache(async (slug: string) => {
  const loaded = await loadCommunity(slug);
  const admin = await getAdminView(loaded.db, loaded.viewer.actor, loaded.community.id);
  const holds = (keys: PermissionKey[]) => keys.some((key) => admin.permissions.includes(key));
  if (!holds(ADMIN_PERMISSIONS) && !admin.isOwner) notFound();
  return { ...loaded, admin, holds };
});

/** For one settings page: 404 unless the viewer holds a permission that opens it. */
export async function requireSection(slug: string, needs: PermissionKey[]) {
  const loaded = await loadAdmin(slug);
  if (!loaded.holds(needs)) notFound();
  return loaded;
}
