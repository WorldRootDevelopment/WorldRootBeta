import { countUnreadConversations } from '@worldroot/core';
import type { ReactNode } from 'react';
import { AppShell } from '@/features/shell/app-shell';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer();
  const { db } = await database();
  const inboxUnread = await countUnreadConversations(db, viewer.actor.userId);
  return (
    <AppShell profile={viewer.profile} inboxUnread={inboxUnread}>
      {children}
    </AppShell>
  );
}
