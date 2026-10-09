import { getCommunityWorld, listLocations } from '@worldroot/core';
import type { Metadata } from 'next';
import { loadCommunity } from '@/features/community/community-view';
import { Breadcrumbs, SectionHeading } from '@/features/shell/prose';
import { RichText } from '@/features/shell/rich-text';
import { LocationTree } from '@/features/worlds/location-tree';
import { load } from '@/lib/load';

interface Props {
  params: Promise<{ community: string; world: string }>;
}

const loadWorld = async ({ params }: Props) => {
  const { community: slug, world: worldSlug } = await params;
  const { community, db } = await loadCommunity(slug);
  const world = await load(() => getCommunityWorld(db, community.id, worldSlug));
  return { community, world, db };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: (await loadWorld(props)).world.name };
}

export default async function WorldPage(props: Props) {
  const { community, world, db } = await loadWorld(props);
  const locations = await listLocations(db, world.id);
  const base = `/c/${community.slug}/worlds/${world.slug}`;

  return (
    <>
      <Breadcrumbs items={[{ label: 'Worlds', href: `/c/${community.slug}/worlds` }, { label: world.name }]} />
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">{world.name}</h2>
      {world.summary ? <p className="mt-2 max-w-2xl text-lg text-ink-muted">{world.summary}</p> : null}
      {world.copiedAt ? (
        <p className="mt-3 text-sm text-ink-muted">
          This is the community&apos;s own copy, added on {world.copiedAt.toLocaleDateString('en', { dateStyle: 'long' })}.
        </p>
      ) : null}

      {world.description ? <RichText docs={world.docs} field="description" text={world.description} className="mt-8" /> : null}

      <SectionHeading>Locations</SectionHeading>
      {locations.length > 0 ? (
        <LocationTree locations={locations} hrefFor={(location) => `${base}/l/${location.id}`} />
      ) : (
        <p className="text-ink-muted">No locations yet.</p>
      )}
    </>
  );
}
