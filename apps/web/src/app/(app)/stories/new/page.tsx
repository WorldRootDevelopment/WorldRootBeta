import { listLibraryCharacters, listLibraryWorlds } from '@worldroot/core';
import type { Metadata } from 'next';
import { PageHeader } from '@/features/shell/page-header';
import { Breadcrumbs } from '@/features/shell/prose';
import { StoryForm } from '@/features/stories/story-form';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'New Story' };

export default async function NewStoryPage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const [characters, worlds] = await Promise.all([listLibraryCharacters(db, viewer.actor.userId), listLibraryWorlds(db, viewer.actor.userId)]);
  return (
    <>
      <Breadcrumbs items={[{ label: 'Stories', href: '/stories' }, { label: 'New Story' }]} />
      <PageHeader title="New Story" lead="Only the title is needed. You can change all of this later." />
      <StoryForm characters={characters.map(({ id, name }) => ({ id, name }))} worlds={worlds.map(({ id, name }) => ({ id, name }))} />
    </>
  );
}
