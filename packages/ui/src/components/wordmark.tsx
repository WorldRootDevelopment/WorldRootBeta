import { cn } from '../cn';

/** The root mark: a trunk that divides into three roots. */
export function RootMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('size-6', className)} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v9" />
      <path d="M12 12c0 4-3 4.5-6 8" />
      <path d="M12 12c0 4 3 4.5 6 8" />
      <path d="M12 12v9" />
      <path d="M8 6.5 12 9l4-2.5" />
    </svg>
  );
}

export function Wordmark({ className, markOnly = false }: { className?: string; markOnly?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-ink', className)}>
      <RootMark className="text-accent" />
      <span className={cn('font-serif text-xl font-semibold tracking-tight', markOnly && 'sr-only')}>WorldRoot</span>
    </span>
  );
}
