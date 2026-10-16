import { getStoryChapter } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import { PenLine } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { ReportButton } from '@/features/moderation/report-client';
import { load } from '@/lib/load';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

interface Props {
  params: Promise<{ storyId: string; chapterId: string }>;
}

const loadChapter = cache(async (storyId: string, chapterId: string) => {
  const viewer = await requireViewer();
  const { db } = await database();
  return load(() => getStoryChapter(db, viewer.actor, storyId, chapterId));
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { storyId, chapterId } = await params;
  const view = await loadChapter(storyId, chapterId);
  return { title: `${view.chapter.title || `Chapter ${view.number}`} · ${view.story.title}` };
}

/** One chapter of a story, set out for reading. */
export default async function ReadChapterPage({ params }: Props) {
  const { storyId, chapterId } = await params;
  const view = await loadChapter(storyId, chapterId);
  const base = `/stories/${storyId}`;
  const name = (title: string | null, number: number) => title || `Chapter ${number}`;

  return (
    <article className="mx-auto max-w-[68ch]">
      <p className="text-sm">
        <Link href={base} className="font-medium text-accent-text underline underline-offset-2 hover:no-underline">
          {view.story.title}
        </Link>
      </p>

      <header className="mt-8 border-b border-line pb-8 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-ink-muted">
          Chapter {view.number} Of {view.of}
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-ink">{name(view.chapter.title, view.number)}</h1>
        {view.story.isOwner ? (
          <p className="mt-5">
            <Link href={`${base}/${chapterId}/write`} className={buttonClass('secondary')}>
              <PenLine className="size-4" aria-hidden="true" />
              Write
            </Link>
          </p>
        ) : (
          <p className="mt-4 inline-flex min-h-11 items-center">
            <ReportButton targetType="story" targetId={storyId} />
          </p>
        )}
      </header>

      {view.chapter.html ? (
        // Rendered on the server from a validated document, so it is safe to insert.
        <div className="wr-prose mt-10 font-serif text-lg" dangerouslySetInnerHTML={{ __html: view.chapter.html }} />
      ) : (
        <p className="mt-10 text-center text-ink-muted">Nothing written here yet.</p>
      )}

      <footer className="mt-14 border-t border-line pt-8">
        <nav aria-label="Chapters" className="flex flex-wrap items-stretch justify-between gap-4">
          {view.previous ? (
            <Link href={`${base}/${view.previous.id}`} className={`${buttonClass('secondary')} h-auto flex-col items-start py-2`}>
              <span className="text-xs text-ink-muted">Previous Chapter</span>
              <span>{name(view.previous.title, view.number - 1)}</span>
            </Link>
          ) : (
            <span />
          )}
          {view.next ? (
            <Link href={`${base}/${view.next.id}`} className={`${buttonClass('secondary')} h-auto flex-col items-end py-2`}>
              <span className="text-xs text-ink-muted">Next Chapter</span>
              <span>{name(view.next.title, view.number + 1)}</span>
            </Link>
          ) : (
            <Link href={base} className={buttonClass('ghost')}>
              Back To The Contents
            </Link>
          )}
        </nav>
      </footer>
    </article>
  );
}
