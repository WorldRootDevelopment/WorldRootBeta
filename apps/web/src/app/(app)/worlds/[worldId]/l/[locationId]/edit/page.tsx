import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/features/shell/page-header';
import { Breadcrumbs } from '@/features/shell/prose';
import { loadLibraryWorld } from '@/features/worlds/library-world';
import { WorldLocationForm } from '@/features/worlds/world-form';

export const metadata: Metadata = { title: 'Edit Location' };

export default async function EditLocationPage({ params }: { params: Promise<{ worldId: string; locationId: string }> }) {
  const { worldId, locationId } = await params;
  const { world, locations } = await loadLibraryWorld(worldId);
  const location = locations.find((candidate) => candidate.id === locationId);
  if (!location) notFound();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: world.name, href: `/worlds/${world.id}` },
          { label: location.name, href: `/worlds/${world.id}/l/${location.id}` },
          { label: 'Edit' },
        ]}
      />
      <PageHeader title={`Edit ${location.name}`} />
      <WorldLocationForm worldId={world.id} location={location} />
    </>
  );
}
