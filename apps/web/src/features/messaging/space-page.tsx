import 'server-only';
import { getSpace, listMessages, SPACES, type SpaceKey } from '@worldroot/core';
import { loadCommunity } from '@/features/community/community-view';
import { load } from '@/lib/load';
import { MessageThread } from './message-thread';

interface SpacePageProps {
  slug: string;
  spaceKey: SpaceKey;
  before?: string;
}

/**
 * A community's Announcements: a quiet notice board. Its chat channels have
 * a page of their own.
 */
export async function SpacePage({ slug, spaceKey, before }: SpacePageProps) {
  const { community, isMember, viewer, db } = await loadCommunity(slug);
  const { conversation } = await load(() => getSpace(db, viewer.actor, community.id, spaceKey));
  const href = `/c/${community.slug}/${spaceKey}`;

  const page = await load(() => listMessages(db, viewer.actor, conversation.id, { beforeId: before }));
  return (
    <>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">{SPACES[spaceKey].label}</h2>
      <p className="mb-8 mt-2 text-ink-muted">News from the people who run this community.</p>
      <MessageThread
        page={page}
        href={href}
        viewingEarlier={Boolean(before)}
        emptyText="No announcements yet."
        placeholder="Write An Announcement…"
        readOnlyNote="Only community staff post here."
        track={isMember}
      />
    </>
  );
}
