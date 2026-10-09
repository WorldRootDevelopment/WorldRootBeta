import { countIncomingFriendRequests, countUnreadNotifications, listConversations, listFriends } from '@worldroot/core';
import { EmptyState } from '@worldroot/ui';
import { MessagesSquare } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { InboxTabs } from '@/features/notifications/inbox-tabs';
import { NewConversationForm } from '@/features/messaging/message-client';
import { PageHeader } from '@/features/shell/page-header';
import { Picture } from '@/features/shell/picture';
import { cardClass, SectionHeading } from '@/features/shell/prose';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Inbox' };

const when = (date: Date) => date.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });

export default async function InboxPage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const [all, unreadNotifications, friendRequests, { friends }] = await Promise.all([
    listConversations(db, viewer.actor),
    countUnreadNotifications(db, viewer.actor.userId),
    countIncomingFriendRequests(db, viewer.actor.userId),
    listFriends(db, viewer.actor),
  ]);
  const onlineFriends = friends.filter((friend) => friend.online);
  const requests = all.filter((conversation) => conversation.request === 'incoming');
  const conversations = all.filter((conversation) => conversation.request !== 'incoming');

  return (
    <>
      <PageHeader title="Inbox" lead="Direct messages for planning and getting to know a partner. Roleplay itself belongs in scenes." />
      <InboxTabs messages={all.filter((conversation) => conversation.unread).length} friends={friendRequests} notifications={unreadNotifications} />

      {onlineFriends.length > 0 ? (
        <section aria-label="Friends Online" className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Online now — {onlineFriends.length}</h2>
          <ul className="flex flex-wrap gap-3">
            {onlineFriends.map((friend) => (
              <li key={friend.userId}>
                <Link
                  href={`/u/${friend.handle}`}
                  className="wr-glass flex items-center gap-2 rounded-full py-1 pl-1 pr-4 text-sm font-medium text-ink hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <span className="relative">
                    <Picture mediaId={friend.avatarId} name={friend.displayName} className="size-8 text-xs" />
                    <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-online ring-2 ring-surface-raised" />
                  </span>
                  {friend.displayName}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="mb-10">
        <NewConversationForm />
      </div>

      {requests.length > 0 ? (
        <>
          <SectionHeading>Message Requests</SectionHeading>
          <p className="mb-3 max-w-3xl text-sm text-ink-muted">From people you share no community with. Open one to accept or decline. They are not told if you decline.</p>
          <ul className="mb-10 flex max-w-3xl flex-col gap-3">
            {requests.map((conversation) => (
              <li key={conversation.id}>
                <Link href={`/inbox/${conversation.id}`} className={cardClass}>
                  <h2 className="truncate font-semibold text-ink">{conversation.title}</h2>
                  <p className="mt-1 truncate text-sm text-ink-muted">{conversation.lastMessage?.body ?? 'Wants to message you.'}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {conversations.length === 0 ? (
        <EmptyState icon={<MessagesSquare className="size-8" aria-hidden="true" />} title="No Messages Yet">
          Start a conversation with another writer by their @handle, or add them as a friend.
        </EmptyState>
      ) : (
        <ul className="flex max-w-3xl flex-col gap-3">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link href={`/inbox/${conversation.id}`} className={cardClass}>
                <div className="flex items-center gap-3">
                  <Picture mediaId={null} name={conversation.title} className="size-10 text-sm" />
                  <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className={`min-w-0 truncate text-ink ${conversation.unread ? 'font-semibold' : 'font-medium'}`}>
                    {conversation.unread ? <span aria-hidden="true" className="mr-2 inline-block size-2 rounded-full bg-accent align-middle" /> : null}
                    {conversation.title}
                    {conversation.unread ? <span className="sr-only"> (unread)</span> : null}
                  </h2>
                  {conversation.lastMessage ? (
                    <time dateTime={conversation.lastMessage.createdAt.toISOString()} className="shrink-0 text-xs text-ink-muted">
                      {when(conversation.lastMessage.createdAt)}
                    </time>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm text-ink-muted">
                  {conversation.lastMessage
                    ? `${conversation.lastMessage.mine ? 'You' : (conversation.lastMessage.authorName ?? 'Someone')}: ${conversation.lastMessage.body}`
                    : 'No messages yet.'}
                </p>
                {conversation.request === 'outgoing' ? <p className="mt-2 text-xs font-medium text-ink-muted">Request sent. Waiting for them to accept.</p> : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
