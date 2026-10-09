import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/features/shell/page-header';
import { Breadcrumbs } from '@/features/shell/prose';
import { loadLibraryWorld } from '@/features/worlds/library-world';
import { WorldLocationForm } from '@/features/worlds/world-form';

export const metadata: Metadata = { title: 'Add Location' };

interface Props {
  params: Promise<{ worldId: string }>;
  searchParams: Promise<{ parent?: string }>;
}

export default async function NewLocationPage({ params, searchParams }: Props) {
  const { world, locations } = await loadLibraryWorld((await params).worldId);
  const parentId = (await searchParams).parent ?? null;
  const parent = parentId ? locations.find((location) => location.id === parentId) : undefined;
  if (parentId && !parent) notFound();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Library', href: '/library' },
          { label: world.name, href: `/worlds/${world.id}` },
          ...(parent ? [{ label: parent.name, href: `/worlds/${world.id}/l/${parent.id}` }] : []),
          { label: 'Add Location' },
        ]}
      />
      <PageHeader title={parent ? `Add A Location Inside ${parent.name}` : 'Add A Location'} lead="Only a name is needed. Describe it now or later." />
      <WorldLocationForm worldId={world.id} parentId={parent?.id ?? null} />
    </>
  );
}
