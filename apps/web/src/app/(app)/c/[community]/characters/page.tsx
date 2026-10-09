import { listCharacterFields, listCommunityCharacters } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CharacterCard } from '@/features/characters/character-card';
import { loadCommunity } from '@/features/community/community-view';

export const metadata: Metadata = { title: 'Characters' };

export default async function CommunityCharactersPage({ params }: { params: Promise<{ community: string }> }) {
  const { community, permissions, db } = await loadCommunity((await params).community);
  const [characters, fields] = await Promise.all([
    listCommunityCharacters(db, community.id),
    listCharacterFields(db, community.id),
  ]);

  const add = permissions.includes('character.submit') ? (
    <div className="mb-8">
      <Link href={`/c/${community.slug}/characters/add`} className={buttonClass('primary')}>
        Add A Character
      </Link>
    </div>
  ) : null;

  if (characters.length === 0) {
    return (
      <>
        {add}
        <p className="text-ink-muted">No characters have joined this community yet.</p>
      </>
    );
  }

  return (
    <>
      {add}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {characters.map((character) => (
        <li key={character.id}>
          <CharacterCard
            character={character}
            // The community's own short fields, in template order.
            facts={fields
              .filter((field) => field.type !== 'long_text')
              .map((field) => character.customValues[field.id])
              .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
              .map(String)}
          />
        </li>
      ))}
      </ul>
    </>
  );
}
