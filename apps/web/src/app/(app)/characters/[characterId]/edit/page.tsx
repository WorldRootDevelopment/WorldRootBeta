import { PREMIUM_LIMITS } from '@worldroot/contracts';
import { getCharacterGallery, getCharacterView, listLibraryCharacters, listRelationships } from '@worldroot/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CharacterForm } from '@/features/characters/character-form';
import { GalleryEditor } from '@/features/characters/character-gallery';
import { NotesEditor, RelationshipsEditor, SharingControl } from '@/features/characters/keeping-client';
import { TagEditor } from '@/features/characters/tag-editor';
import { ImageUpload } from '@/features/media/image-upload';
import { PageHeader } from '@/features/shell/page-header';
import { Breadcrumbs } from '@/features/shell/prose';
import { load } from '@/lib/load';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Edit Character' };

export default async function EditCharacterPage({ params }: { params: Promise<{ characterId: string }> }) {
  const viewer = await requireViewer();
  const { characterId } = await params;
  const { db } = await database();
  const { character, community, canEdit } = await load(() => getCharacterView(db, viewer.actor, characterId));
  if (!canEdit) notFound();
  const gallery = await getCharacterGallery(db, character);
  // Tags belong to the writer's own library, so only the player of an original gets them.
  const ownOriginal = !community && character.playerUserId === viewer.actor.userId;
  const library = ownOriginal ? await listLibraryCharacters(db, viewer.actor.userId) : [];
  const knownTags = [...new Set(library.flatMap((other) => other.tags))].sort();
  const relationships = ownOriginal ? await listRelationships(db, viewer.actor, character.id) : [];

  return (
    <>
      <Breadcrumbs items={[{ label: character.name, href: `/characters/${character.id}` }, { label: 'Edit' }]} />
      <PageHeader
        title={`Edit ${character.name}`}
        lead={
          community
            ? `This is the copy held by ${community.name}. Changes here do not reach the original in your library.`
            : 'This is the original in your library. Copies already in communities are not changed.'
        }
      />
      <div className="mb-10 max-w-2xl">
        <ImageUpload url={`/api/v1/characters/${character.id}/portrait`} mediaId={character.portraitMediaId} name={character.name} label="Portrait" />
      </div>
      {ownOriginal ? (
        <div className="mb-10 flex max-w-2xl flex-col gap-10">
          <SharingControl characterId={character.id} shared={character.shared} />
          <TagEditor characterId={character.id} tags={character.tags} known={knownTags} />
          <RelationshipsEditor
            characterId={character.id}
            relationships={relationships}
            candidates={library.filter((other) => other.id !== character.id).map(({ id, name }) => ({ id, name }))}
          />
          <NotesEditor characterId={character.id} notes={character.privateNotes} />
        </div>
      ) : null}
      <div className="mb-10 max-w-2xl">
        <GalleryEditor characterId={character.id} name={character.name} images={gallery.images} limit={gallery.limit} canGrow={gallery.limit < PREMIUM_LIMITS.characterImages} />
      </div>
      <CharacterForm character={character} />
    </>
  );
}
