import { getCommunityWorld, listLocations } from '@worldroot/core';
import { EmptyState } from '@worldroot/ui';
import { BookOpen } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadCommunity } from '@/features/community/community-view';
import { Breadcrumbs, Prose, SectionHeading } from '@/features/shell/prose';
import { ancestryOf, childrenOf, LocationTree } from '@/features/worlds/location-tree';
import { load } from '@/lib/load';

interface Props {
  params: Promise<{ community: string; world: string; locationId: string }>;
}

const loadLocation = async ({ params }: Props) => {
  const { community: slug, world: worldSlug, locationId } = await params;
  const { community, db } = await loadCommunity(slug);
  const world = await load(() => getCommunityWorld(db, community.id, worldSlug));
  const locations = await listLocations(db, world.id);
  const ancestry = ancestryOf(locations, locationId);
  const location = ancestry.at(-1);
  if (!location) notFound();
  return { community, world, locations, ancestry, location };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: (await loadLocation(props)).location.name };
}

export default async function LocationPage(props: Props) {
  const { community, world, locations, ancestry, location } = await loadLocation(props);
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
      <h2 className="font-serif text-3xl font-semibold tracking-tight text-ink">{location.name}</h2>
      {location.summary ? <p className="mt-2 max-w-2xl text-lg text-ink-muted">{location.summary}</p> : null}
      {location.description ? <Prose text={location.description} className="mt-8" /> : null}

      {childrenOf(locations, location.id).length > 0 ? (
        <>
          <SectionHeading>Inside {location.name}</SectionHeading>
          <div className="rounded-2xl border border-line bg-surface-raised px-1 py-3">
            <LocationTree locations={locations} parentId={location.id} hrefFor={hrefFor} />
          </div>
        </>
      ) : null}

      <SectionHeading>Scenes</SectionHeading>
      <EmptyState icon={<BookOpen className="size-8" aria-hidden="true" />} title="No scenes here yet">
        Scenes set in {location.name} will be listed here. Scene writing arrives in phase 2 of the build.
      </EmptyState>
    </>
  );
}
