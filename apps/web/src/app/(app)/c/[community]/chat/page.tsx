import { listChannels } from '@worldroot/core';
import { redirect } from 'next/navigation';
import { loadCommunity } from '@/features/community/community-view';

/** Opens the first chat channel the viewer can see. */
export default async function ChatPage({ params }: { params: Promise<{ community: string }> }) {
  const { community, viewer, db } = await loadCommunity((await params).community);
  const [first] = await listChannels(db, viewer.actor, community.id);
  if (first) redirect(`/c/${community.slug}/chat/${first.name}`);
  return <p className="text-ink-muted">There are no chat channels here that you can see.</p>;
}
