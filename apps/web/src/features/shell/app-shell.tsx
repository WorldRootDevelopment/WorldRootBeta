import type { Profile } from '@worldroot/contracts';
import { Wordmark } from '@worldroot/ui';
import { Inbox, Plus } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { ChangelogMenu } from '@/features/changelog/changelog-menu';
import { CreateMenu } from './create-menu';
import { HOME_ITEM, MOBILE_ITEMS, RESOURCE_ITEMS, type NavItem } from './nav-items';
import { NavLink } from './nav-link';
import { PresencePing } from './presence-ping';
import { UserMenu } from './user-menu';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export interface ShellCommunity {
  slug: string;
  name: string;
  accentHue: number;
}

/**
 * The frame around every signed-in page.
 * Under 768px: a top bar and a five-item bottom bar. From 768px: an icon rail. From 1440px: a labeled rail.
 * The rail holds Home, a Resources section, and the communities you belong to.
 * The Inbox and the "What's new" menu sit at the top right at every size.
 */
interface AppShellProps {
  profile: Profile;
  /** How many conversations, notifications and friend requests are waiting. Shown as a dot on the Inbox. */
  inboxUnread: number;
  /** The communities this person belongs to, for the rail. */
  communities: ShellCommunity[];
  children: ReactNode;
}

const railLink = `relative flex min-h-11 items-center justify-center gap-3 rounded-lg text-sm font-medium capitalize text-ink-muted hover:bg-surface-sunken hover:text-ink wide:justify-start wide:px-3 ${focusRing}`;
const railActive = 'bg-accent-soft text-accent-text hover:bg-accent-soft hover:text-accent-text';
// On the narrow rail a section is marked by a short rule; on the wide rail by its name.
const sectionHeading =
  'mx-auto mb-1 mt-4 h-px w-8 shrink-0 overflow-hidden bg-line text-[0px] ' +
  'wide:mx-0 wide:h-auto wide:w-auto wide:bg-transparent wide:px-3 wide:text-xs wide:font-semibold wide:uppercase wide:tracking-wide wide:text-ink-muted';

function RailItem({ href, label, icon: Icon }: NavItem) {
  return (
    <NavLink href={href} className={railLink} activeClassName={railActive}>
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="sr-only wide:not-sr-only">{label}</span>
    </NavLink>
  );
}

/** The Inbox, as an icon beside "What's new". The dot says something is waiting; the label says how much. */
function InboxLink({ unread }: { unread: number }) {
  return (
    <NavLink
      href="/inbox"
      className={`relative flex size-11 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink ${focusRing}`}
      activeClassName="bg-accent-soft text-accent-text hover:bg-accent-soft hover:text-accent-text"
    >
      <Inbox className="size-5" aria-hidden="true" />
      <span className="sr-only">{unread > 0 ? `Inbox, ${unread} new` : 'Inbox'}</span>
      {unread > 0 ? <span aria-hidden="true" className="absolute right-2 top-2 size-2.5 rounded-full bg-accent ring-2 ring-surface-raised" /> : null}
    </NavLink>
  );
}

export function AppShell({ profile, inboxUnread, communities, children }: AppShellProps) {
  return (
    <div className="min-h-dvh md:flex">
      <PresencePing />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-surface-raised focus:px-4 focus:py-2">
        Skip to content
      </a>

      <aside className="sticky top-0 z-20 hidden h-dvh w-18 shrink-0 flex-col gap-4 border-r wr-chrome p-3 md:flex wide:w-60 wide:p-4">
        <Link href="/home" className={`flex min-h-11 items-center justify-center rounded-lg wide:justify-start wide:px-2 ${focusRing}`}>
          {/* Each is wrapped, so showing and hiding never competes with the wordmark's own layout classes. */}
          <span className="wide:hidden">
            <Wordmark markOnly />
          </span>
          <span className="hidden wide:inline">
            <Wordmark />
          </span>
        </Link>

        <CreateMenu placement="rail" />

        {/* The rail scrolls by itself when someone belongs to many communities. */}
        <nav aria-label="Primary" className="-mx-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-1 pb-2">
          <RailItem {...HOME_ITEM} />

          <h2 className={sectionHeading}>Resources</h2>
          {RESOURCE_ITEMS.map((item) => (
            <RailItem key={item.href} {...item} />
          ))}

          <h2 className={sectionHeading}>Communities</h2>
          {communities.map((community) => (
            <NavLink key={community.slug} href={`/c/${community.slug}`} className={`${railLink} wide:px-2`} activeClassName={railActive}>
              <span
                aria-hidden="true"
                style={{ '--wr-accent-hue': community.accentHue } as CSSProperties}
                className="wr-accent-scope wr-gloss flex size-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold"
              >
                {community.name.charAt(0).toUpperCase()}
              </span>
              <span className="sr-only min-w-0 truncate wide:not-sr-only">{community.name}</span>
            </NavLink>
          ))}
          <NavLink href="/communities" exact className={`${railLink} wide:px-2`} activeClassName={railActive}>
            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-line-strong">
              <Plus className="size-4" />
            </span>
            <span className="sr-only wide:not-sr-only">{communities.length === 0 ? 'Find a community' : 'All communities'}</span>
          </NavLink>
        </nav>

        <UserMenu profile={profile} placement="rail" />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b wr-chrome px-4 md:hidden">
          <Link href="/home" className={`rounded-lg ${focusRing}`}>
            <Wordmark />
          </Link>
          <div className="flex items-center gap-1">
            <InboxLink unread={inboxUnread} />
            <ChangelogMenu />
            <UserMenu profile={profile} placement="bar" />
          </div>
        </header>

        <div className="hidden justify-end gap-1 px-8 pt-4 md:flex">
          <InboxLink unread={inboxUnread} />
          <ChangelogMenu />
        </div>

        <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 md:px-8 md:pb-12 md:pt-2">
          {children}
        </main>
      </div>

      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 items-center border-t wr-chrome px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
        {MOBILE_ITEMS.map(({ href, label, icon: Icon }, index) => (
          <div key={href} className="contents">
            {/* Create takes the center slot of the bar. */}
            {index === 2 ? <CreateMenu placement="bar" /> : null}
            <NavLink
              href={href}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[0.6875rem] font-medium capitalize text-ink-muted ${focusRing}`}
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
