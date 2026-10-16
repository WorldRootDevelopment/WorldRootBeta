import { listMyStories } from '@worldroot/core';
import { buttonClass, EmptyState } from '@worldroot/ui';
import { Feather } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { StoryCard } from '@/features/stories/story-card';
import { PageHeader } from '@/features/shell/page-header';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Stories' };

/** Everything the viewer has written on their own. */
export default async function StoriesPage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const stories = await listMyStories(db, viewer.actor);

  return (
    <>
      <PageHeader title="Stories" lead="Writing that is yours alone: short stories, one-shots and longer tales with your characters, in chapters." />
      <div className="mb-8">
        <Link href="/stories/new" className={buttonClass('primary')}>
          New Story
        </Link>
      </div>
      {stories.length === 0 ? (
        <EmptyState icon={<Feather className="size-8" aria-hidden="true" />} title="No Stories Yet">
          Start one with a title. Everything you write saves as you go, and stays private until you choose to share it.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stories.map((story) => (
            <li key={story.id}>
              <StoryCard story={story} showVisibility />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
