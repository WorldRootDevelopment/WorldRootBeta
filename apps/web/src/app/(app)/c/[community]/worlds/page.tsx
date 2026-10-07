import { listCommunityWorlds, listLibraryWorlds } from '@worldroot/core';
import type { Metadata } from 'next';
import { AddWorldForm } from '@/features/community/admin/add-world-form';
import { loadCommunity } from '@/features/community/community-view';
import { WorldCard } from '@/features/worlds/world-card';

export const metadata: Metadata = { title: 'Worlds' };

export default async function CommunityWorldsPage({ params }: { params: Promise<{ community: string }> }) {
  const { community, permissions, viewer, db } = await loadCommunity((await params).community);
  const worlds = await listCommunityWorlds(db, community.id);
  const mine = permissions.includes('world.add') ? await listLibraryWorlds(db, viewer.actor.userId) : null;

  return (
    <>
      {worlds.length === 0 ? <p className="text-ink-muted">This community has not added a world yet.</p> : null}
      <ul className="grid gap-4 sm:grid-cols-2">
      {worlds.map((world) => (
        <li key={world.id}>
          <WorldCard world={world} href={`/c/${community.slug}/worlds/${world.slug}`} />
        </li>
      ))}
      </ul>
      {mine ? <AddWorldForm communityId={community.id} communityName={community.name} worlds={mine.map(({ id, name }) => ({ id, name }))} /> : null}
    </>
  );
}
