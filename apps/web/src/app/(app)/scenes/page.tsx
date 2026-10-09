import { listMyScenes } from '@worldroot/core';
import { buttonClass, EmptyState } from '@worldroot/ui';
import { BookOpen } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SceneCard } from '@/features/scenes/scene-card';
import { PageHeader } from '@/features/shell/page-header';
import { SectionHeading } from '@/features/shell/prose';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Scenes' };

export default async function ScenesPage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const scenes = await listMyScenes(db, viewer.actor.userId);

  const open = scenes.filter(({ scene }) => scene.status === 'active' || scene.status === 'on_hold');
  const waiting = open.filter((item) => item.waitingOnYou);
  const others = open.filter((item) => !item.waitingOnYou);
  const finished = scenes.filter(({ scene }) => scene.status === 'completed' || scene.status === 'archived');

  const grid = (items: typeof scenes) => (
    <ul className="grid gap-4 lg:grid-cols-2">
      {items.map((item) => (
        <li key={item.scene.id}>
          <SceneCard summary={item} unread={item.unread} waitingOnYou={item.waitingOnYou} />
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <PageHeader title="Scenes" lead="Every scene you are writing in, with the ones waiting on you first." />
      <div className="mb-10">
        <Link href="/scenes/new" className={buttonClass('primary')}>
          New Private Scene
        </Link>
      </div>

      {scenes.length === 0 ? (
        <EmptyState icon={<BookOpen className="size-8" aria-hidden="true" />} title="No Scenes Yet">
          Start a private scene and invite a partner, or open a location in a community and start one there.
        </EmptyState>
      ) : (
        <>
          {waiting.length > 0 ? (
            <>
              <SectionHeading>Waiting On You</SectionHeading>
              {grid(waiting)}
            </>
          ) : null}
          {others.length > 0 ? (
            <>
              <SectionHeading>In Progress</SectionHeading>
              {grid(others)}
            </>
          ) : null}
          {finished.length > 0 ? (
            <>
              <SectionHeading>Finished</SectionHeading>
              {grid(finished)}
            </>
          ) : null}
        </>
      )}
    </>
  );
}
