import { notificationLine } from '@worldroot/contracts';
import { countIncomingFriendRequests, countUnreadConversations, listNotifications } from '@worldroot/core';
import { EmptyState } from '@worldroot/ui';
import { Bell } from 'lucide-react';
import type { Metadata } from 'next';
import { InboxTabs } from '@/features/notifications/inbox-tabs';
import { MarkAllReadButton, NotificationLink } from '@/features/notifications/notification-client';
import { PageHeader } from '@/features/shell/page-header';
import { cardClass } from '@/features/shell/prose';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Notifications' };

const when = (date: Date) => date.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });

export default async function NotificationsPage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const [notifications, unreadMessages, friendRequests] = await Promise.all([
    listNotifications(db, viewer.actor),
    countUnreadConversations(db, viewer.actor.userId),
    countIncomingFriendRequests(db, viewer.actor.userId),
  ]);
  const unread = notifications.filter((notification) => !notification.readAt).length;

  return (
    <>
      <PageHeader title="Inbox" lead="What has happened in your scenes and communities since you last looked." />
      <InboxTabs messages={unreadMessages} friends={friendRequests} notifications={unread} />

      {notifications.length === 0 ? (
        <EmptyState icon={<Bell className="size-8" aria-hidden="true" />} title="Nothing Yet">
          You will hear here when someone posts in a scene you are writing, invites you to one, or reviews a character.
        </EmptyState>
      ) : (
        <>
          {unread > 0 ? (
            <div className="mb-4 max-w-3xl">
              <MarkAllReadButton />
            </div>
          ) : null}
          <ul className="flex max-w-3xl flex-col gap-3">
            {notifications.map((notification) => {
              const isUnread = !notification.readAt;
              return (
                <li key={notification.id}>
                  <NotificationLink id={notification.id} href={notification.href} unread={isUnread} className={cardClass}>
                    <div className="flex items-baseline justify-between gap-4">
                      <p className={`min-w-0 text-ink ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                        {isUnread ? <span aria-hidden="true" className="mr-2 inline-block size-2 rounded-full bg-accent align-middle" /> : null}
                        {notificationLine(notification.type, notification.actors, notification.count, notification.subject)}
                        {isUnread ? <span className="sr-only"> (Unread)</span> : null}
                      </p>
                      <time dateTime={notification.updatedAt.toISOString()} className="shrink-0 text-xs text-ink-muted">
                        {when(notification.updatedAt)}
                      </time>
                    </div>
                    {notification.preview ? <p className="mt-1 truncate text-sm text-ink-muted">{notification.preview}</p> : null}
                  </NotificationLink>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
