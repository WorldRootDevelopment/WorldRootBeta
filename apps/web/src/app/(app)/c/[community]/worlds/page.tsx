import { listCommunityWorlds } from '@worldroot/core';
import type { Metadata } from 'next';
import { loadCommunity } from '@/features/community/community-view';
import { WorldCard } from '@/features/worlds/world-card';

export const metadata: Metadata = { title: 'Worlds' };

export default async function CommunityWorldsPage({ params }: { params: Promise<{ community: string }> }) {
  const { community, db } = await loadCommunity((await params).community);
  const worlds = await listCommunityWorlds(db, community.id);

  if (worlds.length === 0) return <p className="text-ink-muted">This community has not added a world yet.</p>;

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {worlds.map((world) => (
        <li key={world.id}>
          <WorldCard world={world} href={`/c/${community.slug}/worlds/${world.slug}`} />
        </li>
      ))}
    </ul>
  );
}
