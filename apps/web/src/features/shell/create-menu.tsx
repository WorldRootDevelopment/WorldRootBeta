'use client';

import { cn } from '@worldroot/ui';
import { BookOpen, Globe, Megaphone, Plus, UserRound, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useCloseOnNavigate } from './use-close-on-navigate';

interface CreateItem {
  label: string;
  icon: LucideIcon;
  /** Set once the feature exists. */
  href?: string;
  /** Shown in place of a link until then. */
  arrives?: string;
}

const CREATE_ITEMS: CreateItem[] = [
  { label: 'Scene', icon: BookOpen, href: '/scenes/new' },
  { label: 'Character', icon: UserRound, href: '/library/characters/new' },
  { label: 'World', icon: Globe, href: '/library/worlds/new' },
  { label: 'LFRP listing', icon: Megaphone, arrives: 'Phase 4' },
  { label: 'Community', icon: Users, href: '/communities/new' },
];

interface CreateMenuProps {
  /** `rail` opens beside the desktop rail. `bar` opens above the mobile bottom bar. */
  placement: 'rail' | 'bar';
}

export function CreateMenu({ placement }: CreateMenuProps) {
  const rail = placement === 'rail';
  const ref = useCloseOnNavigate();
  return (
    <details ref={ref} className="group relative">
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-center gap-2 font-medium [&::-webkit-details-marker]:hidden',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          rail
            ? 'wr-gloss min-h-11 rounded-full px-3 text-sm'
            : 'wr-gloss mx-auto size-11 rounded-full',
        )}
      >
        <Plus className="size-5" aria-hidden="true" />
        <span className={rail ? 'hidden wide:inline' : 'sr-only'}>Create</span>
      </summary>
      <ul
        className={cn(
          'absolute z-20 w-60 wr-popover rounded-xl p-1.5',
          rail ? 'left-0 top-full mt-2' : 'bottom-full left-1/2 mb-3 -translate-x-1/2',
        )}
      >
        {CREATE_ITEMS.map(({ label, icon: Icon, href, arrives }) =>
          href ? (
            <li key={label}>
              <Link
                href={href}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-ink hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-focus"
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          ) : (
            <li key={label} aria-disabled="true" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-ink-muted">
              <Icon className="size-4" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              <span className="text-xs">{arrives}</span>
            </li>
          ),
        )}
      </ul>
    </details>
  );
}
