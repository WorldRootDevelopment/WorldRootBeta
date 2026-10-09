import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/features/shell/prose';
import { loadCommunityWorld } from '@/features/worlds/community-world';
import { WorldLocationForm } from '@/features/worlds/world-form';

export const metadata: Metadata = { title: 'Edit Location' };

/** Edit a location in a community's world. For whoever holds "Manage locations" there. */
export default async function EditCommunityLocationPage({ params }: { params: Promise<{ community: string; world: string; locationId: string }> }) {
  const { community: slug, world: worldSlug, locationId } = await params;
  const { community, world, locations, powers, base } = await loadCommunityWorld(slug, worldSlug);
  const location = locations.find((candidate) => candidate.id === locationId);
  if (!location || !powers.editLocations) notFound();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Worlds', href: `/c/${community.slug}/worlds` },
          { label: world.name, href: base },
          { label: location.name, href: `${base}/l/${location.id}` },
          { label: 'Edit' },
        ]}
      />
      <h2 className="mb-8 font-display text-3xl font-semibold tracking-tight text-ink">Edit {location.name}</h2>
      <WorldLocationForm worldId={world.id} location={location} base={base} />
    </>
  );
}
