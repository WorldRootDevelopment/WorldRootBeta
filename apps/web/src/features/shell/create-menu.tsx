import { cn } from '@worldroot/ui';
import { BookOpen, Globe, Megaphone, Plus, UserRound, Users } from 'lucide-react';

// Each entry becomes a link when its feature ships. Until then it says when that is.
const CREATE_ITEMS = [
  { label: 'Scene', icon: BookOpen, arrives: 'Phase 2' },
  { label: 'Character', icon: UserRound, arrives: 'Phase 1' },
  { label: 'World', icon: Globe, arrives: 'Phase 1' },
  { label: 'LFRP listing', icon: Megaphone, arrives: 'Phase 4' },
  { label: 'Community', icon: Users, arrives: 'Phase 3' },
];

interface CreateMenuProps {
  /** `rail` opens beside the desktop rail. `bar` opens above the mobile bottom bar. */
  placement: 'rail' | 'bar';
}

export function CreateMenu({ placement }: CreateMenuProps) {
  const rail = placement === 'rail';
  return (
    <details className="group relative">
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-center gap-2 font-medium [&::-webkit-details-marker]:hidden',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          rail
            ? 'min-h-11 rounded-lg bg-accent px-3 text-sm text-accent-contrast hover:bg-accent-hover'
            : 'mx-auto size-11 rounded-full bg-accent text-accent-contrast',
        )}
      >
        <Plus className="size-5" aria-hidden="true" />
        <span className={rail ? 'hidden wide:inline' : 'sr-only'}>Create</span>
      </summary>
      <ul
        className={cn(
          'absolute z-20 w-60 rounded-xl border border-line bg-surface-raised p-1.5 shadow-raised',
          rail ? 'left-0 top-full mt-2' : 'bottom-full left-1/2 mb-3 -translate-x-1/2',
        )}
      >
        {CREATE_ITEMS.map(({ label, icon: Icon, arrives }) => (
          <li key={label} aria-disabled="true" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-ink-muted">
            <Icon className="size-4" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            <span className="text-xs">{arrives}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
