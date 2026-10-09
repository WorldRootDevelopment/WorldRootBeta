import type { ReactNode } from 'react';
import { cn } from '../cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** What a surface shows when there is nothing in it yet. */
export function EmptyState({ icon, title, children, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center', className)}>
      {icon ? <div className="mb-4 text-ink-muted">{icon}</div> : null}
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      {children ? <p className="mt-2 max-w-md text-ink-muted">{children}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
