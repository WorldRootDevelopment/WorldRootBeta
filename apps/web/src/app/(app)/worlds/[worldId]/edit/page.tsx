import type { Metadata } from 'next';
import { PageHeader } from '@/features/shell/page-header';
import { Breadcrumbs } from '@/features/shell/prose';
import { loadLibraryWorld } from '@/features/worlds/library-world';
import { WorldForm } from '@/features/worlds/world-form';

export const metadata: Metadata = { title: 'Edit world' };

export default async function EditWorldPage({ params }: { params: Promise<{ worldId: string }> }) {
  const { world } = await loadLibraryWorld((await params).worldId);
  return (
    <>
      <Breadcrumbs items={[{ label: 'Library', href: '/library' }, { label: world.name, href: `/worlds/${world.id}` }, { label: 'Edit' }]} />
      <PageHeader title={`Edit ${world.name}`} lead="Copies already in communities are not changed." />
      <WorldForm world={world} />
    </>
  );
}
