import { countUnreadNotifications, listConversations } from '@worldroot/core';
import { EmptyState } from '@worldroot/ui';
import { MessagesSquare } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { InboxTabs } from '@/features/notifications/inbox-tabs';
import { NewConversationForm } from '@/features/messaging/message-client';
import { PageHeader } from '@/features/shell/page-header';
import { cardClass, SectionHeading } from '@/features/shell/prose';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Inbox' };

const when = (date: Date) => date.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });

export default async function InboxPage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const [all, unreadNotifications] = await Promise.all([listConversations(db, viewer.actor), countUnreadNotifications(db, viewer.actor.userId)]);
  const requests = all.filter((conversation) => conversation.request === 'incoming');
  const conversations = all.filter((conversation) => conversation.request !== 'incoming');

  return (
    <>
      <PageHeader title="Inbox" lead="Private messages for planning and getting to know a partner. Roleplay itself belongs in scenes." />
      <InboxTabs messages={all.filter((conversation) => conversation.unread).length} notifications={unreadNotifications} />
      <div className="mb-10">
        <NewConversationForm />
      </div>

      {requests.length > 0 ? (
        <>
          <SectionHeading>Message requests</SectionHeading>
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
        <EmptyState icon={<MessagesSquare className="size-8" aria-hidden="true" />} title="No messages yet">
          Start a conversation with another writer by their @handle.
        </EmptyState>
      ) : (
        <ul className="flex max-w-3xl flex-col gap-3">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link href={`/inbox/${conversation.id}`} className={cardClass}>
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
