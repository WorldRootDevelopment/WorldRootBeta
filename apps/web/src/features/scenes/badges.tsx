import { CONTENT_RATING_LABELS, SCENE_STATUS_LABELS, type ContentRating, type SceneStatus } from '@worldroot/contracts';
import { cn } from '@worldroot/ui';

const pill = 'inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-medium';

const statusClass: Record<SceneStatus, string> = {
  active: 'bg-accent-soft text-accent-text',
  on_hold: 'bg-surface-sunken text-ink-muted',
  completed: 'border border-line-strong text-ink',
  archived: 'bg-surface-sunken text-ink-muted',
};

export function StatusBadge({ status }: { status: SceneStatus }) {
  return <span className={cn(pill, statusClass[status])}>{SCENE_STATUS_LABELS[status]}</span>;
}

export function RatingBadge({ rating }: { rating: ContentRating }) {
  return (
    <span className={cn(pill, 'border border-line-strong text-ink-muted')} title="Content Rating">
      {CONTENT_RATING_LABELS[rating]}
    </span>
  );
}
