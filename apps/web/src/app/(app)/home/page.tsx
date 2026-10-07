import { listMyScenes } from '@worldroot/core';
import { buttonClass, EmptyState } from '@worldroot/ui';
import { Sprout } from 'lucide-react';
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

  return (
    <>
      <PageHeader title={`Welcome, ${profile.displayName}`} lead="Scenes waiting on you and news from your communities will gather here." />
      {open.length === 0 ? (
        <EmptyState icon={<Sprout className="size-8" aria-hidden="true" />} title="Nothing has taken root yet">
          Create a character, then start a private scene or find a community to write in.
          <span className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/library/characters/new" className={buttonClass('primary')}>
              Create a character
            </Link>
            <Link href="/communities" className={buttonClass('secondary')}>
              Browse communities
            </Link>
          </span>
        </EmptyState>
      ) : (
        <>
          <SectionHeading>{waiting.length > 0 ? 'Waiting on you' : 'Your scenes'}</SectionHeading>
          <ul className="grid gap-4 lg:grid-cols-2">
            {(waiting.length > 0 ? waiting : open).slice(0, 6).map((item) => (
              <li key={item.scene.id}>
                <SceneCard summary={item} unread={item.unread} waitingOnYou={item.waitingOnYou} />
              </li>
            ))}
          </ul>
          <p className="mt-6">
            <Link href="/scenes" className={buttonClass('secondary')}>
              All your scenes
            </Link>
          </p>
        </>
      )}
    </>
  );
}
