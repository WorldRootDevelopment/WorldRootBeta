import { listLibraryCharacters, listLibraryWorlds } from '@worldroot/core';
import { EmptyState } from '@worldroot/ui';
import { Library as LibraryIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { CharacterCard } from '@/features/characters/character-card';
import { PageHeader } from '@/features/shell/page-header';
import { SectionHeading } from '@/features/shell/prose';
import { WorldCard } from '@/features/worlds/world-card';
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

      {characters.length === 0 && worlds.length === 0 ? (
        <EmptyState icon={<LibraryIcon className="size-8" aria-hidden="true" />} title="Your library is empty">
          Creating characters and worlds arrives in phase 1, the next phase of the build.
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
                  <WorldCard world={world} note="Original. Library world pages arrive in phase 1." />
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
