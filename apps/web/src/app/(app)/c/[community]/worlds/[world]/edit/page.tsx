import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/features/shell/prose';
import { loadCommunityWorld } from '@/features/worlds/community-world';
import { WorldForm } from '@/features/worlds/world-form';

export const metadata: Metadata = { title: 'Edit World' };

/** Edit a community's own copy of a world. For whoever holds "Manage worlds" there; to anyone else it does not exist. */
export default async function EditCommunityWorldPage({ params }: { params: Promise<{ community: string; world: string }> }) {
  const { community: slug, world: worldSlug } = await params;
  const { community, world, powers, base } = await loadCommunityWorld(slug, worldSlug);
  if (!powers.editWorld) notFound();

  return (
    <>
      <Breadcrumbs items={[{ label: 'Worlds', href: `/c/${community.slug}/worlds` }, { label: world.name, href: base }, { label: 'Edit' }]} />
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">Edit {world.name}</h2>
      <p className="mb-8 mt-2 max-w-2xl text-ink-muted">
        This is {community.name}’s own copy. Changes here are seen by everyone in the community and do not reach the original in anyone’s library.
      </p>
      <WorldForm world={world} returnTo={base} />
    </>
  );
}
