import { countUnreadConversations, countUnreadNotifications, listFriends, type FriendRow } from '@worldroot/core';
import { EmptyState } from '@worldroot/ui';
import { UserPlus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AddFriendForm, FriendRowActions } from '@/features/friends/friend-client';
import { Badges } from '@/features/identity/badges';
import { MessageButton } from '@/features/identity/profile-client';
import { InboxTabs } from '@/features/notifications/inbox-tabs';
import { PageHeader } from '@/features/shell/page-header';
import { Picture } from '@/features/shell/picture';
import { SectionHeading } from '@/features/shell/prose';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Friends' };

function Person({ person, showPresence, children }: { person: FriendRow; showPresence: boolean; children: ReactNode }) {
  return (
    <li className="wr-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative">
          <Picture mediaId={person.avatarId} name={person.displayName} className="size-11 text-base" />
          {showPresence ? (
            <span aria-hidden="true" className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-2 ring-surface-raised ${person.online ? 'bg-online' : 'bg-line-strong'}`} />
          ) : null}
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
            <Link href={`/u/${person.handle}`} className="truncate rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
              {person.displayName}
            </Link>
            <Badges list={person.badges} />
          </p>
          <p className="truncate text-sm text-ink-muted">
            @{person.handle}
            {showPresence ? ` · ${person.online ? 'Online' : 'Offline'}` : ''}
            {person.status ? ` · ${person.status}` : ''}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </li>
  );
}

export default async function FriendsPage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const [{ friends, incoming, outgoing }, unreadMessages, unreadNotifications] = await Promise.all([
    listFriends(db, viewer.actor),
    countUnreadConversations(db, viewer.actor.userId),
    countUnreadNotifications(db, viewer.actor.userId),
  ]);
  const online = friends.filter((friend) => friend.online).length;

  return (
    <>
      <PageHeader title="Inbox" lead="The people you write with. Friends can message each other without a request first." />
      <InboxTabs messages={unreadMessages} friends={incoming.length} notifications={unreadNotifications} />

      <div className="mb-10">
        <AddFriendForm />
      </div>

      {incoming.length > 0 ? (
        <>
          <SectionHeading>Requests — {incoming.length}</SectionHeading>
          <ul className="flex max-w-3xl flex-col gap-3">
            {incoming.map((person) => (
              <Person key={person.userId} person={person} showPresence={false}>
                <FriendRowActions userId={person.userId} kind="incoming" />
              </Person>
            ))}
          </ul>
        </>
      ) : null}

      {outgoing.length > 0 ? (
        <>
          <SectionHeading>Sent — {outgoing.length}</SectionHeading>
          <ul className="flex max-w-3xl flex-col gap-3">
            {outgoing.map((person) => (
              <Person key={person.userId} person={person} showPresence={false}>
                <FriendRowActions userId={person.userId} kind="outgoing" />
              </Person>
            ))}
          </ul>
        </>
      ) : null}

      <SectionHeading>
        Friends — {friends.length}
        {friends.length > 0 ? <span className="ml-2 text-sm font-normal text-ink-muted">{online} online</span> : null}
      </SectionHeading>
      {friends.length === 0 ? (
        <EmptyState icon={<UserPlus className="size-8" aria-hidden="true" />} title="No friends yet" className="max-w-3xl">
          Add someone by their @handle above, or use “Add friend” on their profile.
        </EmptyState>
      ) : (
        <ul className="flex max-w-3xl flex-col gap-3">
          {friends.map((person) => (
            <Person key={person.userId} person={person} showPresence>
              <MessageButton handle={person.handle} />
              <FriendRowActions userId={person.userId} kind="friend" />
            </Person>
          ))}
        </ul>
      )}
    </>
  );
}
