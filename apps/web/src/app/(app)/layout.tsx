import { countUnreadConversations, countUnreadNotifications } from '@worldroot/core';
import type { ReactNode } from 'react';
import { AppShell } from '@/features/shell/app-shell';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer();
  const { db } = await database();
  const [messages, notifications] = await Promise.all([countUnreadConversations(db, viewer.actor.userId), countUnreadNotifications(db, viewer.actor.userId)]);
  const inboxUnread = messages + notifications;
  return (
    <AppShell profile={viewer.profile} inboxUnread={inboxUnread}>
      {children}
    </AppShell>
  );
}
