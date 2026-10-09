import { listCharacterFields, listLibraryCharacters } from '@worldroot/core';
import { buttonClass, EmptyState } from '@worldroot/ui';
import { UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AddToCommunityForm } from '@/features/characters/add-to-community-form';
import { loadCommunity } from '@/features/community/community-view';

export const metadata: Metadata = { title: 'Add a character' };

export default async function AddCharacterPage({ params }: { params: Promise<{ community: string }> }) {
  const { community, permissions, viewer, db } = await loadCommunity((await params).community);
  const [characters, fields] = await Promise.all([
    listLibraryCharacters(db, viewer.actor.userId),
    listCharacterFields(db, community.id),
  ]);

  return (
    <>
      <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight text-ink">Add a character</h2>
      {!permissions.includes('character.submit') ? (
        <EmptyState title="Join the community first">Members of {community.name} can add their characters.</EmptyState>
      ) : characters.length === 0 ? (
        <EmptyState icon={<UserRound className="size-8" aria-hidden="true" />} title="Your library has no characters yet">
          Create a character in your library, then bring them here.
          <span className="mt-6 block">
            <Link href="/library/characters/new" className={buttonClass('primary')}>
              Create a character
            </Link>
          </span>
        </EmptyState>
      ) : (
        <AddToCommunityForm
          communityId={community.id}
          communitySlug={community.slug}
          communityName={community.name}
          characters={characters.map(({ id, name, tagline }) => ({ id, name, tagline }))}
          fields={fields}
        />
      )}
    </>
  );
}
