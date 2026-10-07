import type { Profile } from '@worldroot/contracts';
import { Wordmark } from '@worldroot/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChangelogMenu } from '@/features/changelog/changelog-menu';
import { CreateMenu } from './create-menu';
import { NAV_ITEMS } from './nav-items';
import { NavLink } from './nav-link';
import { UserMenu } from './user-menu';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/**
 * The frame around every signed-in page.
 * Under 768px: a top bar and a five-item bottom bar. From 768px: an icon rail. From 1440px: a labelled rail.
 * The "What's new" menu sits at the top right at every size.
 */
export function AppShell({ profile, children }: { profile: Profile; children: ReactNode }) {
  return (
    <div className="min-h-dvh md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-surface-raised focus:px-4 focus:py-2">
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh w-18 shrink-0 flex-col gap-4 border-r border-line bg-surface-raised p-3 md:flex wide:w-60 wide:p-4">
        <Link href="/home" className={`flex min-h-11 items-center justify-center rounded-lg wide:justify-start wide:px-2 ${focusRing}`}>
          <Wordmark className="wide:hidden" markOnly />
          <Wordmark className="hidden wide:inline-flex" />
        </Link>

        <CreateMenu placement="rail" />

        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <NavLink
              key={href}
              href={href}
              className={`flex min-h-11 items-center justify-center gap-3 rounded-lg text-sm font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink wide:justify-start wide:px-3 ${focusRing}`}
              activeClassName="bg-accent-soft text-accent-text hover:bg-accent-soft hover:text-accent-text"
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="sr-only wide:not-sr-only">{label}</span>
            </NavLink>
          ))}
        </nav>

        <UserMenu profile={profile} placement="rail" />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-surface-raised px-4 md:hidden">
          <Link href="/home" className={`rounded-lg ${focusRing}`}>
            <Wordmark />
          </Link>
          <div className="flex items-center gap-1">
            <ChangelogMenu />
            <UserMenu profile={profile} placement="bar" />
          </div>
        </header>

        <div className="hidden justify-end px-8 pt-4 md:flex">
          <ChangelogMenu />
        </div>

        <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-28 pt-8 md:px-8 md:pb-12 md:pt-2">
          {children}
        </main>
      </div>

      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 items-center border-t border-line bg-surface-raised px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV_ITEMS.filter((item) => item.mobile).map(({ href, label, icon: Icon }, index) => (
          <div key={href} className="contents">
            {/* Create takes the centre slot of the bar. */}
            {index === 2 ? <CreateMenu placement="bar" /> : null}
            <NavLink
              href={href}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[0.6875rem] font-medium text-ink-muted ${focusRing}`}
              activeClassName="text-accent-text"
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          </div>
        ))}
      </nav>
    </div>
  );
}
