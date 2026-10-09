import 'server-only';
import { getSpace, listMessages, SPACES, type SpaceKey } from '@worldroot/core';
import { loadCommunity } from '@/features/community/community-view';
import { load } from '@/lib/load';
import { ChatRoom } from './chat-room';
import { MessageThread } from './message-thread';

const loungeNote = (member: boolean) => (member ? 'You do not have permission to post in the Lounge.' : 'Join the community to chat.');

interface SpacePageProps {
  slug: string;
  spaceKey: SpaceKey;
  before?: string;
}

/**
 * One of a community's two built-in spaces. Announcements is a quiet notice
 * board. The Lounge is a live chat room.
 */
export async function SpacePage({ slug, spaceKey, before }: SpacePageProps) {
  const { community, isMember, viewer, db } = await loadCommunity(slug);
  const { conversation } = await load(() => getSpace(db, viewer.actor, community.id, spaceKey));
  const href = `/c/${community.slug}/${spaceKey}`;

  if (spaceKey === 'lounge') {
    const page = await load(() => listMessages(db, viewer.actor, conversation.id, { beforeId: before, limit: 100 }));
    return (
      <>
        <h2 className="sr-only">{SPACES.lounge.label}</h2>
        <ChatRoom
          page={page}
          href={href}
          viewingEarlier={Boolean(before)}
          placeholder={`Message The ${community.name} Lounge`}
          readOnlyNote={loungeNote(isMember)}
          track={isMember}
        />
      </>
    );
  }

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
