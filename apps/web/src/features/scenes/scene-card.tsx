import type { SceneSummary } from '@worldroot/core';
import Link from 'next/link';
import { cardClass } from '@/features/shell/prose';
import { RatingBadge, StatusBadge } from './badges';

interface SceneCardProps {
  summary: SceneSummary;
  unread?: number;
  waitingOnYou?: boolean;
}

export function SceneCard({ summary, unread = 0, waitingOnYou = false }: SceneCardProps) {
  const { scene, communityName, locationName, cast } = summary;
  const where = scene.communityId ? [communityName, locationName].filter(Boolean).join(' · ') : 'Private scene';

  return (
    <Link href={`/scenes/${scene.id}`} className={cardClass}>
      <div className="flex flex-wrap items-center gap-2">
        {waitingOnYou ? (
          <span className="inline-flex min-h-6 items-center rounded-full bg-accent px-2.5 text-xs font-medium text-accent-contrast">
            Waiting on you
          </span>
        ) : null}
        <StatusBadge status={scene.status} />
        <RatingBadge rating={scene.rating} />
        {unread > 0 ? <span className="text-xs font-medium text-accent-text">{unread} new</span> : null}
      </div>
      <h3 className="mt-3 font-serif text-xl font-semibold text-ink">{scene.title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{where}</p>
      {scene.description ? <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink">{scene.description}</p> : null}
      <p className="mt-4 text-sm text-ink-muted">
        {cast.length > 0 ? cast.join(', ') : 'No characters yet'}
        <span aria-hidden="true"> · </span>
        {scene.icPostCount} {scene.icPostCount === 1 ? 'post' : 'posts'}
      </p>
    </Link>
  );
}
