'use client';

import type { Profile } from '@worldroot/contracts';
import { cn } from '@worldroot/ui';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badges } from '@/features/identity/badges';
import { authClient } from '@/lib/auth-client';
import { NAV_ITEMS } from './nav-items';
import { ThemeToggle } from './theme-toggle';
import { useCloseOnNavigate } from './use-close-on-navigate';

interface UserMenuProps {
  profile: Profile;
  /** `rail` opens upward from the foot of the desktop rail. `bar` opens downward from the mobile top bar. */
  placement: 'rail' | 'bar';
}

const itemClass =
  'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-ink hover:bg-surface-sunken ' +
  'focus-visible:outline-2 focus-visible:outline-focus';

export function UserMenu({ profile, placement }: UserMenuProps) {
  const router = useRouter();
  const ref = useCloseOnNavigate();
  const rail = placement === 'rail';
  const initial = profile.displayName.charAt(0).toUpperCase();

  const signOut = async () => {
    await authClient.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <details ref={ref} className="relative">
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center gap-3 rounded-lg [&::-webkit-details-marker]:hidden',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          rail && 'min-h-11 justify-center p-1 hover:bg-surface-sunken wide:justify-start wide:px-2',
        )}
      >
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-text">
          {initial}
        </span>
        <span className={rail ? 'hidden min-w-0 wide:block' : 'sr-only'}>
          <span className="block truncate text-sm font-medium text-ink">{profile.displayName}</span>
          <span className="block truncate text-xs text-ink-muted">@{profile.handle}</span>
        </span>
      </summary>

      <div
        className={cn(
          'absolute z-20 w-64 rounded-xl border border-line bg-surface-raised p-1.5 shadow-raised',
          rail ? 'bottom-full left-0 mb-2' : 'right-0 top-full mt-2',
        )}
      >
        <div className="px-3 py-2">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <span className="truncate">{profile.displayName}</span>
            <Badges list={profile.badges} />
          </p>
          <p className="truncate text-xs text-ink-muted">@{profile.handle}</p>
        </div>

        {/* On small screens the bottom bar holds five items; the rest are reached from here. */}
        <ul className="border-t border-line py-1.5 md:hidden">
          {NAV_ITEMS.filter((item) => !item.mobile).map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className={itemClass}>
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <ul className="border-t border-line py-1.5">
          <li>
            <Link href={`/u/${profile.handle}`} className={itemClass}>
              Your profile
            </Link>
          </li>
          <li>
            <Link href="/settings/profile" className={itemClass}>
              Settings
            </Link>
          </li>
          {profile.isStaff ? (
            <li>
              <Link href="/staff" className={itemClass}>
                Staff portal
              </Link>
            </li>
          ) : null}
        </ul>

        <ul className="border-t border-line py-1.5">
          <li>
            <Link href="/" className={itemClass}>
              About WorldRoot
            </Link>
          </li>
          <li>
            <Link href="/alternatives" className={itemClass}>
              Alternative universes
            </Link>
          </li>
        </ul>

        <div className="border-t border-line px-1.5 py-2.5">
          <ThemeToggle />
        </div>

        <div className="border-t border-line pt-1.5">
          <button type="button" onClick={signOut} className={itemClass}>
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </details>
  );
}
