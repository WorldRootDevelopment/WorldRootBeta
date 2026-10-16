import { getStoryChapter } from '@worldroot/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/features/shell/prose';
import { ChapterEditor } from '@/features/stories/chapter-editor';
import { load } from '@/lib/load';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Writing' };

/** Writing one chapter. For the story's writer alone. */
export default async function WriteChapterPage({ params }: { params: Promise<{ storyId: string; chapterId: string }> }) {
  const { storyId, chapterId } = await params;
  const viewer = await requireViewer();
  const { db } = await database();
  const view = await load(() => getStoryChapter(db, viewer.actor, storyId, chapterId));
  if (!view.story.isOwner || !view.doc) notFound();
  return (
    <>
      <Breadcrumbs items={[{ label: 'Stories', href: '/stories' }, { label: view.story.title, href: `/stories/${storyId}` }, { label: `Chapter ${view.number}` }]} />
      <ChapterEditor storyId={storyId} chapterId={chapterId} title={view.chapter.title} doc={view.doc} wordCount={view.chapter.wordCount} number={view.number} />
    </>
  );
}
