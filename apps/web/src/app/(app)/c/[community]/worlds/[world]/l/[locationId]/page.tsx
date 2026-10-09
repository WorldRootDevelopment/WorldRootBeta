import { getCommunityWorld, listLocations, listLocationScenes } from '@worldroot/core';
import { buttonClass, EmptyState } from '@worldroot/ui';
import { BookOpen } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadCommunity } from '@/features/community/community-view';
import { SceneCard } from '@/features/scenes/scene-card';
import { Breadcrumbs, Prose, SectionHeading } from '@/features/shell/prose';
import { ancestryOf, childrenOf, LocationTree } from '@/features/worlds/location-tree';
import { load } from '@/lib/load';

interface Props {
  params: Promise<{ community: string; world: string; locationId: string }>;
}

const loadLocation = async ({ params }: Props) => {
  const { community: slug, world: worldSlug, locationId } = await params;
  const { community, permissions, db } = await loadCommunity(slug);
  const world = await load(() => getCommunityWorld(db, community.id, worldSlug));
  const locations = await listLocations(db, world.id);
  const ancestry = ancestryOf(locations, locationId);
  const location = ancestry.at(-1);
  if (!location) notFound();
  const scenes = await listLocationScenes(db, location.id);
  return { community, world, locations, ancestry, location, scenes, canStart: permissions.includes('scene.create') };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: (await loadLocation(props)).location.name };
}

export default async function LocationPage(props: Props) {
  const { community, world, locations, ancestry, location, scenes, canStart } = await loadLocation(props);
  const worldHref = `/c/${community.slug}/worlds/${world.slug}`;
  const hrefFor = (target: { id: string }) => `${worldHref}/l/${target.id}`;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Worlds', href: `/c/${community.slug}/worlds` },
          { label: world.name, href: worldHref },
          ...ancestry.slice(0, -1).map((parent) => ({ label: parent.name, href: hrefFor(parent) })),
          { label: location.name },
        ]}
      />
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">{location.name}</h2>
      {location.summary ? <p className="mt-2 max-w-2xl text-lg text-ink-muted">{location.summary}</p> : null}
      {location.description ? <Prose text={location.description} className="mt-8" /> : null}

      {childrenOf(locations, location.id).length > 0 ? (
        <>
          <SectionHeading>Inside {location.name}</SectionHeading>
          <div className="wr-glass rounded-2xl px-1 py-3">
            <LocationTree locations={locations} parentId={location.id} hrefFor={hrefFor} />
          </div>
        </>
      ) : null}

      <div className="mb-4 mt-12 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-xl font-semibold text-ink">Scenes</h2>
        {canStart ? (
          <Link href={`/scenes/new?location=${location.id}`} className={buttonClass('primary')}>
            Start a scene here
          </Link>
        ) : null}
      </div>
      {scenes.length > 0 ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {scenes.map((summary) => (
            <li key={summary.scene.id}>
              <SceneCard summary={summary} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<BookOpen className="size-8" aria-hidden="true" />} title="No scenes here yet">
          {canStart ? `Be the first to set a scene in ${location.name}.` : `Members can start a scene in ${location.name}.`}
        </EmptyState>
      )}
    </>
  );
}
