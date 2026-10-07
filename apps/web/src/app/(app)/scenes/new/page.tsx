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

export const metadata: Metadata = { title: 'New scene' };

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
                { label: 'New scene' },
              ]
            : [{ label: 'Scenes', href: '/scenes' }, { label: 'New scene' }]
        }
      />
      <PageHeader
        title={place ? `New scene in ${place.locationName}` : 'New private scene'}
        lead={
          place
            ? `Open to everyone in ${place.communityName} who can see this location.`
            : 'Only you and the writers you invite can see a private scene. You can invite them once it exists.'
        }
      />

      {!canCreate ? (
        <EmptyState title="Join the community to start a scene">
          Members of {place?.communityName} can start scenes here.
          <span className="mt-6 block">
            <Link href={`/c/${place?.communitySlug}`} className={buttonClass('primary')}>
              Go to {place?.communityName}
            </Link>
          </span>
        </EmptyState>
      ) : characters.length === 0 ? (
        <EmptyState icon={<UserRound className="size-8" aria-hidden="true" />} title="You need a character first">
          {place
            ? `A scene in ${place.communityName} is written with characters you have added to that community.`
            : 'A scene is written with characters from your library.'}
          <span className="mt-6 block">
            <Link href={place ? `/c/${place.communitySlug}/characters/add` : '/library/characters/new'} className={buttonClass('primary')}>
              {place ? 'Add a character to this community' : 'Create a character'}
            </Link>
          </span>
        </EmptyState>
      ) : (
        <NewSceneForm locationId={place?.locationId ?? null} characters={characters} cancelHref={backHref} />
      )}
    </div>
  );
}
