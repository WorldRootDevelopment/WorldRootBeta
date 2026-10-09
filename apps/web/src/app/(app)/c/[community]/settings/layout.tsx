import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { loadAdmin, settingsSections } from '@/features/community/admin/admin-view';
import { NavLink } from '@/features/shell/nav-link';

export const metadata: Metadata = { title: 'Settings' };

interface Props {
  params: Promise<{ community: string }>;
  children: ReactNode;
}

export default async function SettingsLayout({ params, children }: Props) {
  const { community, admin, holds } = await loadAdmin((await params).community);
  // General is where the owner archives, restores and deletes, so the owner always has it.
  const sections = settingsSections(community.slug).filter((section) => holds(section.needs) || (section.label === 'General' && admin.isOwner));

  return (
    <div className="grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <nav aria-label="Community Settings">
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          {sections.map((section) => (
            <li key={section.href} className="shrink-0">
              <NavLink
                href={section.href}
                exact
                className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                activeClassName="bg-accent-soft text-accent-text hover:bg-accent-soft hover:text-accent-text"
              >
                {section.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
