import { listLibraryCharacters, listLibraryWorlds } from '@worldroot/core';
import { buttonClass, EmptyState } from '@worldroot/ui';
import { Library as LibraryIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CharacterCard } from '@/features/characters/character-card';
import { PageHeader } from '@/features/shell/page-header';
import { SectionHeading } from '@/features/shell/prose';
import { WorldCard } from '@/features/worlds/world-card';
import { ImportWorldForm } from '@/features/worlds/world-sharing';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Library' };

export default async function LibraryPage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const [characters, worlds] = await Promise.all([
    listLibraryCharacters(db, viewer.actor.userId),
    listLibraryWorlds(db, viewer.actor.userId),
  ]);

  return (
    <>
      <PageHeader title="Library" lead="Your own characters and worlds, independent of any community." />

      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/library/characters/new" className={buttonClass('primary')}>
          New character
        </Link>
        <Link href="/library/worlds/new" className={buttonClass('secondary')}>
          New world
        </Link>
        <Link href="/library/worlds/templates" className={buttonClass('secondary')}>
          World templates
        </Link>
      </div>
      <div className="mb-10">
        <ImportWorldForm />
      </div>

      {characters.length === 0 && worlds.length === 0 ? (
        <EmptyState icon={<LibraryIcon className="size-8" aria-hidden="true" />} title="Your library is empty">
          Characters and worlds you make live here, independent of any community. Start with a character: all it needs is a name.
        </EmptyState>
      ) : (
        <>
          <SectionHeading>Characters</SectionHeading>
          {characters.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {characters.map((character) => (
                <li key={character.id}>
                  <CharacterCard character={character} note="Original" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-muted">No characters yet.</p>
          )}

          <SectionHeading>Worlds</SectionHeading>
          {worlds.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {worlds.map((world) => (
                <li key={world.id}>
                  <WorldCard world={world} href={`/worlds/${world.id}`} note={world.sourceWorldId ? 'Your copy of a shared world' : world.shareCode ? 'Original · shared by ID' : 'Original'} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-muted">No worlds yet.</p>
          )}
        </>
      )}
    </>
  );
}
