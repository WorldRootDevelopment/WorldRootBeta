import { NavLink } from '@/features/shell/nav-link';

const tab =
  'inline-flex min-h-11 items-center border-b-2 border-transparent px-1 text-sm font-medium capitalize text-ink-muted hover:text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** Personal settings: how you appear, how WorldRoot looks for you, and how you sign in. */
export function SettingsTabs() {
  return (
    <nav aria-label="Settings" className="-mt-2 mb-2 flex gap-6 border-b border-line">
      <NavLink href="/settings/profile" className={tab} activeClassName="border-accent text-ink">
        Profile
      </NavLink>
      <NavLink href="/settings/customization" className={tab} activeClassName="border-accent text-ink">
        Customization
      </NavLink>
      <NavLink href="/settings/achievements" className={tab} activeClassName="border-accent text-ink">
        Achievements
      </NavLink>
      <NavLink href="/settings/badges" className={tab} activeClassName="border-accent text-ink">
        Badges
      </NavLink>
      <NavLink href="/settings/account" className={tab} activeClassName="border-accent text-ink">
        Account
      </NavLink>
    </nav>
  );
}
