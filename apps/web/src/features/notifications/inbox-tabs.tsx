import { NavLink } from '@/features/shell/nav-link';

const tab =
  'inline-flex min-h-11 items-center gap-2 border-b-2 border-transparent px-1 text-sm font-medium capitalize text-ink-muted hover:text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

const Count = ({ value }: { value: number }) =>
  value > 0 ? (
    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">
      {value}
      <span className="sr-only"> waiting</span>
    </span>
  ) : null;

/** The three parts of the Inbox: direct messages, friends, and what has happened. */
export function InboxTabs({ messages, friends, notifications }: { messages: number; friends: number; notifications: number }) {
  return (
    <nav aria-label="Inbox" className="-mt-2 mb-8 flex gap-6 border-b border-line">
      <NavLink href="/inbox" exact className={tab} activeClassName="border-accent text-ink">
        Direct messages
        <Count value={messages} />
      </NavLink>
      <NavLink href="/inbox/friends" className={tab} activeClassName="border-accent text-ink">
        Friends
        <Count value={friends} />
      </NavLink>
      <NavLink href="/inbox/notifications" className={tab} activeClassName="border-accent text-ink">
        Notifications
        <Count value={notifications} />
      </NavLink>
    </nav>
  );
}
