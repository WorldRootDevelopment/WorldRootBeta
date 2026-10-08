import 'server-only';
import { getSpace, listMessages, SPACES, type SpaceKey } from '@worldroot/core';
import { loadCommunity } from '@/features/community/community-view';
import { load } from '@/lib/load';
import { MessageThread } from './message-thread';

const COPY: Record<SpaceKey, { lead: string; empty: string; placeholder: string; readOnly: (member: boolean) => string }> = {
  announcements: {
    lead: 'News from the people who run this community.',
    empty: 'No announcements yet.',
    placeholder: 'Write an announcement…',
    readOnly: () => 'Only community staff post here.',
  },
  lounge: {
    lead: 'Out-of-character talk for the whole community. Roleplay happens in scenes.',
    empty: 'Nobody has said anything yet.',
    placeholder: 'Say something to the community…',
    readOnly: (member) => (member ? 'You do not have permission to post in the Lounge.' : 'Join the community to take part.'),
  },
};

interface SpacePageProps {
  slug: string;
  spaceKey: SpaceKey;
  before?: string;
}

/** One of a community's two built-in spaces. Both are the same thread with different rules about who posts. */
export async function SpacePage({ slug, spaceKey, before }: SpacePageProps) {
  const { community, isMember, viewer, db } = await loadCommunity(slug);
  const { conversation } = await load(() => getSpace(db, viewer.actor, community.id, spaceKey));
  const page = await load(() => listMessages(db, viewer.actor, conversation.id, { beforeId: before }));
  const copy = COPY[spaceKey];

  return (
    <>
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">{SPACES[spaceKey].label}</h2>
      <p className="mb-8 mt-2 text-ink-muted">{copy.lead}</p>
      <MessageThread
        page={page}
        href={`/c/${community.slug}/${spaceKey}`}
        viewingEarlier={Boolean(before)}
        emptyText={copy.empty}
        placeholder={copy.placeholder}
        readOnlyNote={copy.readOnly(isMember)}
        track={isMember}
      />
    </>
  );
}
