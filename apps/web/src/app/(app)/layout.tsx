import { countIncomingFriendRequests, countUnreadConversations, countUnreadNotifications, listMyCommunities } from '@worldroot/core';
import type { ReactNode } from 'react';
import { AppShell } from '@/features/shell/app-shell';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

/** `modal` is whatever is open over the page, such as a profile pop-up. Usually nothing. */
export default async function AppLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  const viewer = await requireViewer();
  const { db } = await database();
  const { userId } = viewer.actor;
  const [messages, notifications, friendRequests, mine] = await Promise.all([
    countUnreadConversations(db, userId),
    countUnreadNotifications(db, userId),
    countIncomingFriendRequests(db, userId),
    listMyCommunities(db, userId),
  ]);
  return (
    <AppShell
      profile={viewer.profile}
      inboxUnread={messages + notifications + friendRequests}
      // Archived communities stay reachable from the Communities page; the rail is for the ones in use.
      communities={mine.filter((community) => !community.archivedAt).map(({ slug, name, accentHue }) => ({ slug, name, accentHue }))}
    >
      {children}
      {modal}
    </AppShell>
  );
}
