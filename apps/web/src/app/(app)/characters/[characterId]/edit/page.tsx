import { PREMIUM_LIMITS } from '@worldroot/contracts';
import { getCharacterGallery, getCharacterView } from '@worldroot/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CharacterForm } from '@/features/characters/character-form';
import { GalleryEditor } from '@/features/characters/character-gallery';
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
      <div className="mb-10 max-w-2xl">
        <GalleryEditor characterId={character.id} name={character.name} images={gallery.images} limit={gallery.limit} canGrow={gallery.limit < PREMIUM_LIMITS.characterImages} />
      </div>
      <CharacterForm character={character} />
    </>
  );
}
