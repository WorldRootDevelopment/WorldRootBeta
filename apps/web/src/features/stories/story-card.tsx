import { CONTENT_RATING_LABELS, STORY_VISIBILITY_LABELS } from '@worldroot/contracts';
import type { StorySummary } from '@worldroot/core';
import Link from 'next/link';
import { cardClass } from '@/features/shell/prose';

/** One story in a list: its title, summary and how much of it there is. */
export function StoryCard({ story, showAuthor = false, showVisibility = false }: { story: StorySummary; showAuthor?: boolean; showVisibility?: boolean }) {
  return (
    <Link href={`/stories/${story.id}`} className={cardClass}>
      <h3 className="font-serif text-xl font-semibold text-ink">{story.title}</h3>
      {showAuthor && story.authorName ? <p className="text-sm text-ink-muted">By {story.authorName}</p> : null}
      {story.summary ? <p className="mt-2 line-clamp-3 text-sm text-ink">{story.summary}</p> : null}
      <p className="mt-3 text-xs text-ink-muted">
        {story.chapterCount} {story.chapterCount === 1 ? 'Chapter' : 'Chapters'} · {story.wordCount.toLocaleString('en')} {story.wordCount === 1 ? 'Word' : 'Words'} ·{' '}
        {CONTENT_RATING_LABELS[story.rating]}
        {showVisibility ? ` · ${STORY_VISIBILITY_LABELS[story.visibility].label}` : ''}
      </p>
    </Link>
  );
}
