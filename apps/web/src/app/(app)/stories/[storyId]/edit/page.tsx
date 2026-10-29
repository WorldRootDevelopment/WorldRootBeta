import { getStory, listLibraryCharacters, listLibraryWorlds } from '@worldroot/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/features/shell/page-header';
import { Breadcrumbs } from '@/features/shell/prose';
import { StoryForm } from '@/features/stories/story-form';
import { load } from '@/lib/load';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';
import type { ContentRating, StoryVisibility } from '@worldroot/contracts';

export const metadata: Metadata = { title: 'Story Details' };

export default async function EditStoryPage({ params }: { params: Promise<{ storyId: string }> }) {
  const viewer = await requireViewer();
  const { db } = await database();
  const view = await load(async () => getStory(db, viewer.actor, (await params).storyId));
  if (!view.isOwner) notFound();
  const [characters, worlds] = await Promise.all([listLibraryCharacters(db, viewer.actor.userId), listLibraryWorlds(db, viewer.actor.userId)]);
  const { story } = view;
  return (
    <>
      <Breadcrumbs items={[{ label: 'Stories', href: '/stories' }, { label: story.title, href: `/stories/${story.id}` }, { label: 'Details' }]} />
      <PageHeader title="Story Details" />
      <StoryForm
        characters={characters.map(({ id, name }) => ({ id, name }))}
        worlds={worlds.map(({ id, name }) => ({ id, name }))}
        story={{
          id: story.id,
          title: story.title,
          summary: story.summary,
          rating: story.rating as ContentRating,
          visibility: story.visibility as StoryVisibility,
          worldId: story.worldId,
          characterIds: view.characters.map((character) => character.id),
          commentsOpen: story.commentsOpen,
        }}
      />
    </>
  );
}
