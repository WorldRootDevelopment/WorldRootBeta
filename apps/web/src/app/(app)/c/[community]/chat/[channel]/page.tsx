import { getChannel, listChannels, listMessages, type ChannelSummary } from '@worldroot/core';
import { Hash, Lock } from 'lucide-react';
import type { Metadata } from 'next';
import { loadCommunity } from '@/features/community/community-view';
import { ChatRoom } from '@/features/messaging/chat-room';
import { NavLink } from '@/features/shell/nav-link';
import { load } from '@/lib/load';

interface Props {
  params: Promise<{ community: string; channel: string }>;
  searchParams: Promise<{ before?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `#${decodeURIComponent((await params).channel)}` };
}

/** Channels under their headings, in order. Those with no heading come first, under none. */
function grouped(channels: ChannelSummary[]): Array<{ heading: string | null; channels: ChannelSummary[] }> {
  const groups: Array<{ heading: string | null; channels: ChannelSummary[] }> = [];
  for (const channel of channels) {
    const group = groups.find((candidate) => candidate.heading === channel.category);
    if (group) group.channels.push(channel);
    else groups.push({ heading: channel.category, channels: [channel] });
  }
  return groups.sort((a, b) => Number(a.heading !== null) - Number(b.heading !== null));
}

/** A community's chat: its channels down one side, and the chosen one open beside them. */
export default async function ChannelPage({ params, searchParams }: Props) {
  const { community: slug, channel: name } = await params;
  const { before } = await searchParams;
  const { community, isMember, viewer, db } = await loadCommunity(slug);
  const { channel, access } = await load(() => getChannel(db, viewer.actor, community.id, decodeURIComponent(name)));
  const [channels, page] = await Promise.all([
    listChannels(db, viewer.actor, community.id),
    load(() => listMessages(db, viewer.actor, channel.conversationId, { beforeId: before, limit: 100 })),
  ]);
  const base = `/c/${community.slug}/chat`;
  const note = !isMember ? 'Join the community to chat.' : channel.postRoleIds ? 'Only some roles can post in this channel.' : 'You do not have permission to post here.';

  return (
    <div className="grid gap-3 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-5">
      {/* On a phone the channels are one scrolling row, so the conversation and its message box stay on screen. */}
      <nav aria-label="Chat Channels" className="wr-glass flex h-fit gap-3 overflow-x-auto rounded-2xl p-1.5 md:block md:p-3">
        {grouped(channels).map((group) => (
          <div key={group.heading ?? ''} className="flex shrink-0 items-center gap-1 md:mb-3 md:block md:last:mb-0">
            {group.heading ? <h3 className="hidden px-2 text-xs font-semibold uppercase tracking-wide text-ink-muted md:mb-1 md:block">{group.heading}</h3> : null}
            <ul className="flex gap-0.5 md:flex-col">
              {group.channels.map((item) => (
                <li key={item.id}>
                  <NavLink
                    href={`${base}/${item.name}`}
                    className={`flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-2 text-sm hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${item.unread ? 'font-semibold text-ink' : 'text-ink-muted'}`}
                    activeClassName="bg-accent-soft text-accent-text hover:bg-accent-soft"
                  >
                    {item.restricted ? <Lock className="size-4 shrink-0" aria-hidden="true" /> : <Hash className="size-4 shrink-0" aria-hidden="true" />}
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {item.restricted ? <span className="sr-only">Private Channel</span> : null}
                    {/* The dot repeats what the bolder name already shows, so "new messages" never rests on color alone. */}
                    {item.unread ? (
                      <>
                        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-accent" />
                        <span className="sr-only">New Messages</span>
                      </>
                    ) : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="min-w-0">
        <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="flex items-center gap-1.5 font-display text-xl font-semibold text-ink">
            <Hash className="size-5 text-ink-muted" aria-hidden="true" />
            {channel.name}
          </h2>
          {channel.topic ? <p className="text-sm text-ink-muted">{channel.topic}</p> : null}
        </header>
        <ChatRoom
          page={page}
          href={`${base}/${channel.name}`}
          viewingEarlier={Boolean(before)}
          placeholder={`Message #${channel.name}`}
          readOnlyNote={note}
          track={isMember}
          label={`#${channel.name}`}
          viewerHandle={viewer.profile?.handle ?? null}
        />
        {access.canPost ? null : <p className="sr-only">You can read this channel but not post in it.</p>}
      </div>
    </div>
  );
}
