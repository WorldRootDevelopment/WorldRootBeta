import { CONTENT_RATING_LABELS } from '@worldroot/contracts';
import { listChapters } from '@worldroot/core';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadCommunity } from '@/features/community/community-view';

export const metadata: Metadata = { title: 'Chronicle' };

const day = (date: Date) => date.toLocaleDateString('en', { dateStyle: 'long' });

/** The table of contents of a community's Chronicle: its finished scenes, in the order they were finished. */
export default async function ChroniclePage({ params }: { params: Promise<{ community: string }> }) {
  const { community, db } = await loadCommunity((await params).community);
  if (!community.chronicle) notFound();
  const chapters = await listChapters(db, community.id);

  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">The Chronicle Of {community.name}</h2>
      <p className="mt-2 text-ink-muted">
        Every scene finished here becomes a chapter, in the order it was finished. Together they are the story this community has told so far.
      </p>

      {chapters.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line-strong px-5 py-6 text-ink-muted">
          No chapters yet. When a scene in this community is marked complete, it appears here.
        </p>
      ) : (
        <ol className="mt-8 flex flex-col gap-3">
          {chapters.map((chapter) => (
            <li key={chapter.sceneId}>
              <Link
                href={`/c/${community.slug}/chronicle/${chapter.sceneId}`}
                className="wr-glass group flex gap-5 rounded-2xl p-5 hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <span aria-hidden="true" className="w-12 shrink-0 text-center font-serif text-4xl leading-none text-accent-text">
                  {chapter.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium uppercase tracking-wide text-ink-muted">
                    Chapter {chapter.number}
                    {chapter.locationName ? ` · ${chapter.locationName}` : ''}
                  </span>
                  <span className="mt-0.5 block font-serif text-xl font-semibold text-ink group-hover:underline">{chapter.title}</span>
                  {chapter.description ? <span className="mt-1 block text-sm text-ink-muted">{chapter.description}</span> : null}
                  {chapter.characters.length > 0 ? <span className="mt-2 block text-sm text-ink">With {chapter.characters.join(', ')}</span> : null}
                  <span className="mt-2 block text-xs text-ink-muted">
                    {chapter.postCount} {chapter.postCount === 1 ? 'Post' : 'Posts'} · {CONTENT_RATING_LABELS[chapter.rating]} · Finished {day(chapter.completedAt)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
