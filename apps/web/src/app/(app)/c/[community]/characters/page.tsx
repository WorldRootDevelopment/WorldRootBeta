import { listCharacterFields, listCommunityCharacters } from '@worldroot/core';
import type { Metadata } from 'next';
import { CharacterCard } from '@/features/characters/character-card';
import { loadCommunity } from '@/features/community/community-view';

export const metadata: Metadata = { title: 'Characters' };

export default async function CommunityCharactersPage({ params }: { params: Promise<{ community: string }> }) {
  const { community, db } = await loadCommunity((await params).community);
  const [characters, fields] = await Promise.all([
    listCommunityCharacters(db, community.id),
    listCharacterFields(db, community.id),
  ]);

  if (characters.length === 0) return <p className="text-ink-muted">No characters have joined this community yet.</p>;

  return (
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
  );
}
