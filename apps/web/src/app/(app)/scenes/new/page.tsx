import { getSceneSetup } from '@worldroot/core';
import { buttonClass, EmptyState } from '@worldroot/ui';
import { UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { NewSceneForm } from '@/features/scenes/new-scene-form';
import { PageHeader } from '@/features/shell/page-header';
import { Breadcrumbs } from '@/features/shell/prose';
import { load } from '@/lib/load';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'New Scene' };

export default async function NewScenePage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const viewer = await requireViewer();
  const locationId = (await searchParams).location ?? null;
  const { db } = await database();
  const { place, characters, canCreate } = await load(() => getSceneSetup(db, viewer.actor, locationId));

  const locationHref = place ? `/c/${place.communitySlug}/worlds/${place.worldSlug}/l/${place.locationId}` : null;
  const backHref = locationHref ?? '/scenes';

  return (
    <div className={place ? 'wr-accent-scope' : undefined} style={place ? ({ '--wr-accent-hue': place.accentHue } as CSSProperties) : undefined}>
      <Breadcrumbs
        items={
          place
            ? [
                { label: place.communityName, href: `/c/${place.communitySlug}` },
                { label: place.worldName, href: `/c/${place.communitySlug}/worlds/${place.worldSlug}` },
                { label: place.locationName, href: locationHref! },
                { label: 'New Scene' },
              ]
            : [{ label: 'Scenes', href: '/scenes' }, { label: 'New Scene' }]
        }
      />
      <PageHeader
        title={place ? `New Scene In ${place.locationName}` : 'New Private Scene'}
        lead={
          place
            ? `Open to everyone in ${place.communityName} who can see this location.`
            : 'Only you and the writers you invite can see a private scene. You can invite them once it exists.'
        }
      />

      {!canCreate ? (
        <EmptyState title="Join The Community To Start A Scene">
          Members of {place?.communityName} can start scenes here.
          <span className="mt-6 block">
            <Link href={`/c/${place?.communitySlug}`} className={buttonClass('primary')}>
              Go To {place?.communityName}
            </Link>
          </span>
        </EmptyState>
      ) : characters.length === 0 ? (
        <EmptyState icon={<UserRound className="size-8" aria-hidden="true" />} title="You Need A Character First">
          {place
            ? `A scene in ${place.communityName} is written with characters you have added to that community.`
            : 'A scene is written with characters from your library.'}
          <span className="mt-6 block">
            <Link href={place ? `/c/${place.communitySlug}/characters/add` : '/library/characters/new'} className={buttonClass('primary')}>
              {place ? 'Add A Character To This Community' : 'Create A Character'}
            </Link>
          </span>
        </EmptyState>
      ) : (
        <NewSceneForm locationId={place?.locationId ?? null} characters={characters} cancelHref={backHref} />
      )}
    </div>
  );
}
