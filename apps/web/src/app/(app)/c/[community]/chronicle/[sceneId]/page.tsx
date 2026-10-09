import { CONTENT_RATING_LABELS } from '@worldroot/contracts';
import { getChapter } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import { Dices } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { PostImages } from '@/features/scenes/post-images';
import { load } from '@/lib/load';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

interface Props {
  params: Promise<{ community: string; sceneId: string }>;
}

const loadChapter = cache(async (sceneId: string) => {
  const viewer = await requireViewer();
  const { db } = await database();
  return load(() => getChapter(db, viewer.actor, sceneId));
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const chapter = await loadChapter((await params).sceneId);
  return { title: `Chapter ${chapter.number}: ${chapter.title}` };
}

/**
 * One chapter of a community's Chronicle: a finished scene set out for
 * reading. Only the story is here. Who wrote each post, the out-of-character
 * talk and the controls all stay on the scene's own page.
 */
export default async function ChapterPage({ params }: Props) {
  const { community: slug, sceneId } = await params;
  const chapter = await loadChapter(sceneId);
  // A chapter belongs to one community's book and is read at that community's address.
  if (chapter.community.slug !== slug) notFound();
  const base = `/c/${slug}/chronicle`;

  return (
    <article className="mx-auto max-w-[68ch]">
      <p className="text-sm">
        <Link href={base} className="font-medium text-accent-text underline underline-offset-2 hover:no-underline">
          The Chronicle Of {chapter.community.name}
        </Link>
      </p>

      <header className="mt-8 border-b border-line pb-8 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-ink-muted">
          Chapter {chapter.number} Of {chapter.of}
        </p>
        <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight text-ink md:text-5xl">{chapter.title}</h2>
        {chapter.description ? <p className="mt-4 font-serif text-lg italic text-ink-muted">{chapter.description}</p> : null}
        <p className="mt-4 text-xs text-ink-muted">
          {chapter.locationName ? `${chapter.locationName} · ` : ''}
          {CONTENT_RATING_LABELS[chapter.rating]} · Finished {chapter.completedAt.toLocaleDateString('en', { dateStyle: 'long' })}
        </p>
      </header>

      <div className="mt-10 flex flex-col gap-10">
        {chapter.posts.map((post) =>
          post.kind === 'system' ? (
            <aside key={post.id} className="flex items-start gap-3 rounded-xl bg-surface-sunken px-4 py-3 text-sm text-ink">
              <Dices className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden="true" />
              <div className="min-w-0" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
            </aside>
          ) : (
            <section key={post.id} id={`post-${post.seq}`} className="scroll-mt-24">
              {post.characterName ? <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-accent-text">{post.characterName}</h3> : null}
              {/* Rendered on the server from a validated document, so it is safe to insert. */}
              <div className="wr-prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
              <PostImages images={post.images} />
            </section>
          ),
        )}
      </div>

      {chapter.cutShort ? (
        <p role="status" className="mt-10 rounded-lg bg-surface-sunken px-4 py-3 text-sm text-ink">
          This is a long chapter and only its first part is shown here.{' '}
          <Link href={`/scenes/${chapter.sceneId}`} className="font-medium text-accent-text underline">
            Read The Whole Scene
          </Link>
        </p>
      ) : null}

      <footer className="mt-14 border-t border-line pt-8">
        <nav aria-label="Chapters" className="flex flex-wrap items-stretch justify-between gap-4">
          {chapter.previous ? (
            <Link href={`${base}/${chapter.previous.sceneId}`} className={`${buttonClass('secondary')} h-auto flex-col items-start py-2`}>
              <span className="text-xs text-ink-muted">Previous Chapter</span>
              <span>{chapter.previous.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {chapter.next ? (
            <Link href={`${base}/${chapter.next.sceneId}`} className={`${buttonClass('secondary')} h-auto flex-col items-end py-2`}>
              <span className="text-xs text-ink-muted">Next Chapter</span>
              <span>{chapter.next.title}</span>
            </Link>
          ) : (
            <span className="self-center text-sm text-ink-muted">The story so far ends here.</span>
          )}
        </nav>
        <p className="mt-6 text-sm">
          <Link href={`/scenes/${chapter.sceneId}`} className="font-medium text-accent-text underline underline-offset-2 hover:no-underline">
            Open The Scene
          </Link>
          <span className="text-ink-muted"> to see who wrote it and what was said out of character.</span>
        </p>
      </footer>
    </article>
  );
}
