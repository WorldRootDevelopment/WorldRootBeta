import { NavLink } from '@/features/shell/nav-link';

const tab =
  'inline-flex min-h-11 items-center border-b-2 border-transparent px-1 text-sm font-medium capitalize text-ink-muted hover:text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** The two things to find: somewhere to belong, and someone to write with. */
export function DiscoverTabs() {
  return (
    <nav aria-label="Discover" className="-mt-2 mb-8 flex gap-6 border-b border-line">
      <NavLink href="/discover" exact className={tab} activeClassName="border-accent text-ink">
        Communities
      </NavLink>
      <NavLink href="/discover/partners" className={tab} activeClassName="border-accent text-ink">
        Looking for RP
      </NavLink>
    </nav>
  );
}
