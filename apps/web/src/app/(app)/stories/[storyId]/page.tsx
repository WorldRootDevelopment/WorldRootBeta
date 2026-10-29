import { CONTENT_RATING_LABELS, STORY_VISIBILITY_LABELS, type StoryVisibility } from '@worldroot/contracts';
import { getKudos, getStory } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import { Download, PenLine } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { Breadcrumbs } from '@/features/shell/prose';
import { ReportButton } from '@/features/moderation/report-client';
import { AddChapterButton, ChapterControls } from '@/features/stories/story-client';
import { KudosButton } from '@/features/stories/story-social';
import { load } from '@/lib/load';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

interface Props {
  params: Promise<{ storyId: string }>;
}

const loadStory = cache(async (storyId: string) => {
  const viewer = await requireViewer();
  const { db } = await database();
  const view = await load(() => getStory(db, viewer.actor, storyId));
  return { ...view, kudos: await getKudos(db, viewer.actor, storyId) };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await loadStory((await params).storyId)).story.title };
}

/** A story's front page: title, summary, who is in it, and its chapters. */
export default async function StoryPage({ params }: Props) {
  const view = await loadStory((await params).storyId);
  const { story, isOwner, author, world, characters, chapters, wordCount, kudos } = view;
  const chapterName = (chapter: { title: string | null }, index: number) => chapter.title || `Chapter ${index + 1}`;

  return (
    <div className="mx-auto max-w-3xl">
      {isOwner ? <Breadcrumbs items={[{ label: 'Stories', href: '/stories' }, { label: story.title }]} /> : null}

      <header className="border-b border-line pb-8 text-center">
        <h1 className="font-serif text-4xl font-semibold leading-tight text-ink md:text-5xl">{story.title}</h1>
        {author.name ? (
          <p className="mt-3 text-ink-muted">
            By{' '}
            {author.handle ? (
              <Link href={`/u/${author.handle}`} className="font-medium text-ink hover:underline">
                {author.name}
              </Link>
            ) : (
              author.name
            )}
          </p>
        ) : null}
        {story.summary ? <p className="mx-auto mt-5 max-w-xl font-serif text-lg italic text-ink-muted">{story.summary}</p> : null}
        <p className="mt-5 text-xs text-ink-muted">
          {chapters.length} {chapters.length === 1 ? 'Chapter' : 'Chapters'} · {wordCount.toLocaleString('en')} {wordCount === 1 ? 'Word' : 'Words'} · {CONTENT_RATING_LABELS[story.rating]}
          {isOwner ? ` · ${STORY_VISIBILITY_LABELS[story.visibility as StoryVisibility].label}` : ''}
        </p>
        {characters.length > 0 || world ? (
          <p className="mt-3 text-sm text-ink">
            {characters.length > 0 ? (
              <>
                With{' '}
                {characters.map((character, index) => (
                  <span key={character.id}>
                    {index > 0 ? ', ' : ''}
                    <Link href={`/characters/${character.id}`} className="font-medium text-accent-text hover:underline">
                      {character.name}
                    </Link>
                  </span>
                ))}
              </>
            ) : null}
            {world ? <span className="text-ink-muted">{characters.length > 0 ? ' · ' : ''}Set in {world.name}</span> : null}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {chapters[0] ? (
            <Link href={`/stories/${story.id}/${chapters[0].id}`} className={buttonClass('primary')}>
              Start Reading
            </Link>
          ) : null}
          {isOwner ? (
            <Link href={`/stories/${story.id}/edit`} className={buttonClass('secondary')}>
              Details And Sharing
            </Link>
          ) : null}
          {/* A plain link, so the browser downloads the file. */}
          <a href={`/api/v1/stories/${story.id}/export`} className={buttonClass('ghost')}>
            <Download className="size-4" aria-hidden="true" />
            Download
          </a>
          {story.visibility === 'private' ? null : <KudosButton storyId={story.id} count={kudos.count} mine={kudos.mine} canGive={!isOwner} />}
          {isOwner ? null : (
            <span className="inline-flex min-h-11 items-center px-2">
              <ReportButton targetType="story" targetId={story.id} />
            </span>
          )}
        </div>
      </header>

      <section aria-labelledby="contents" className="mt-8">
        <h2 id="contents" className="mb-4 font-display text-lg font-semibold text-ink">
          Contents
        </h2>
        <ol className="flex flex-col divide-y divide-line">
          {chapters.map((chapter, index) => (
            <li key={chapter.id} className="flex flex-wrap items-center gap-3 py-3">
              <span aria-hidden="true" className="w-8 shrink-0 text-right font-serif text-xl text-accent-text">
                {index + 1}
              </span>
              <Link href={`/stories/${story.id}/${chapter.id}`} className="min-w-0 flex-1 font-serif text-lg text-ink hover:underline">
                {chapterName(chapter, index)}
              </Link>
              <span className="text-xs text-ink-muted">{chapter.wordCount.toLocaleString('en')} Words</span>
              {isOwner ? (
                <>
                  <Link href={`/stories/${story.id}/${chapter.id}/write`} className={buttonClass('secondary')}>
                    <PenLine className="size-4" aria-hidden="true" />
                    Write
                  </Link>
                  <ChapterControls chapterId={chapter.id} title={chapterName(chapter, index)} first={index === 0} last={index === chapters.length - 1} />
                </>
              ) : null}
            </li>
          ))}
        </ol>
        {isOwner ? (
          <div className="mt-6">
            <AddChapterButton storyId={story.id} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
