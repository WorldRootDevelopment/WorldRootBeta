import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/features/shell/prose';
import { loadCommunityWorld } from '@/features/worlds/community-world';
import { WorldLocationForm } from '@/features/worlds/world-form';

export const metadata: Metadata = { title: 'Add Location' };

interface Props {
  params: Promise<{ community: string; world: string }>;
  searchParams: Promise<{ parent?: string }>;
}

/** Add a location to a community's world. For whoever holds "Create locations" there. */
export default async function NewCommunityLocationPage({ params, searchParams }: Props) {
  const { community: slug, world: worldSlug } = await params;
  const { community, world, locations, powers, base } = await loadCommunityWorld(slug, worldSlug);
  if (!powers.addLocations) notFound();
  const parentId = (await searchParams).parent ?? null;
  const parent = parentId ? locations.find((location) => location.id === parentId) : undefined;
  if (parentId && !parent) notFound();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Worlds', href: `/c/${community.slug}/worlds` },
          { label: world.name, href: base },
          ...(parent ? [{ label: parent.name, href: `${base}/l/${parent.id}` }] : []),
          { label: 'Add Location' },
        ]}
      />
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">{parent ? `Add A Location Inside ${parent.name}` : 'Add A Location'}</h2>
      <p className="mb-8 mt-2 max-w-2xl text-ink-muted">Only a name is needed. Describe it now or later. Members can set scenes here as soon as it is added.</p>
      <WorldLocationForm worldId={world.id} parentId={parent?.id ?? null} base={base} />
    </>
  );
}
