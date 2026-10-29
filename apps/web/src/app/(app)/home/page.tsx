import { listLibraryCharacters, listMyScenes, listMyStories } from '@worldroot/core';
import { buttonClass, EmptyState } from '@worldroot/ui';
import { Feather, Library, Sprout } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SceneCard } from '@/features/scenes/scene-card';
import { SectionHeading } from '@/features/shell/prose';
import { database } from '@/lib/server';
import { PageHeader } from '@/features/shell/page-header';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Home' };

export default async function HomePage() {
  const { profile, actor } = await requireViewer();
  const { db } = await database();
  const open = (await listMyScenes(db, actor.userId)).filter(({ scene }) => scene.status === 'active' || scene.status === 'on_hold');
  const waiting = open.filter((item) => item.waitingOnYou);
  // Someone who came to write or keep characters on their own sees those first.
  const solo = profile.intent === 'write' || profile.intent === 'keep';
  const [stories, library] = solo ? await Promise.all([listMyStories(db, actor), listLibraryCharacters(db, actor.userId)]) : [[], []];
  const ownCorner = solo ? (
    <section className="mb-10 grid gap-4 sm:grid-cols-2">
      <Link href={stories[0] ? `/stories/${stories[0].id}` : '/stories/new'} className="wr-glass flex items-start gap-4 rounded-2xl p-5 hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
        <Feather className="mt-1 size-6 shrink-0 text-accent-text" aria-hidden="true" />
        <span>
          <span className="block font-display text-lg font-semibold text-ink">{stories[0] ? `Keep Writing: ${stories[0].title}` : 'Start A Story'}</span>
          <span className="block text-sm text-ink-muted">
            {stories.length > 0 ? `${stories.length} ${stories.length === 1 ? 'story' : 'stories'}, ${stories.reduce((total, story) => total + story.wordCount, 0).toLocaleString('en')} words so far.` : 'Write on your own, in chapters, with your characters.'}
          </span>
        </span>
      </Link>
      <Link href="/library" className="wr-glass flex items-start gap-4 rounded-2xl p-5 hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
        <Library className="mt-1 size-6 shrink-0 text-accent-text" aria-hidden="true" />
        <span>
          <span className="block font-display text-lg font-semibold text-ink">Your Characters</span>
          <span className="block text-sm text-ink-muted">{library.length > 0 ? `${library.length} in your library.` : 'Make your first: all it needs is a name.'}</span>
        </span>
      </Link>
    </section>
  ) : null;

  return (
    <>
      <PageHeader
        title={`Welcome, ${profile.displayName}`}
        lead={solo ? 'Your stories and characters, and any scenes you join.' : 'Scenes waiting on you and news from your communities will gather here.'}
      />
      {ownCorner}
      {open.length === 0 && solo ? null : open.length === 0 ? (
        <EmptyState icon={<Sprout className="size-8" aria-hidden="true" />} title="Nothing Has Taken Root Yet">
          Create a character, then start a private scene or find a community to write in.
          <span className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/library/characters/new" className={buttonClass('primary')}>
              Create A Character
            </Link>
            <Link href="/communities" className={buttonClass('secondary')}>
              Browse Communities
            </Link>
          </span>
        </EmptyState>
      ) : (
        <>
          <SectionHeading>{waiting.length > 0 ? 'Waiting On You' : 'Your Scenes'}</SectionHeading>
          <ul className="grid gap-4 lg:grid-cols-2">
            {(waiting.length > 0 ? waiting : open).slice(0, 6).map((item) => (
              <li key={item.scene.id}>
                <SceneCard summary={item} unread={item.unread} waitingOnYou={item.waitingOnYou} />
              </li>
            ))}
          </ul>
          <p className="mt-6">
            <Link href="/scenes" className={buttonClass('secondary')}>
              All Your Scenes
            </Link>
          </p>
        </>
      )}
    </>
  );
}
