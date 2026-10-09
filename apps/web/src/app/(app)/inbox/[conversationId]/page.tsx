import { getConversationSummary, listMessages } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';
import { RequestBar } from '@/features/identity/account-client';
import { MessageThread } from '@/features/messaging/message-thread';
import { Breadcrumbs } from '@/features/shell/prose';
import { load } from '@/lib/load';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

interface Props {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ before?: string }>;
}

const loadConversation = cache(async (conversationId: string) => {
  const viewer = await requireViewer();
  const { db } = await database();
  const summary = await load(() => getConversationSummary(db, viewer.actor, conversationId));
  return { summary, viewer, db };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await loadConversation((await params).conversationId)).summary.title };
}

export default async function ConversationPage({ params, searchParams }: Props) {
  const { conversationId } = await params;
  const before = (await searchParams).before;
  const { summary, viewer, db } = await loadConversation(conversationId);
  const page = await load(() => listMessages(db, viewer.actor, conversationId, { beforeId: before }));

  return (
    <>
      <Breadcrumbs items={[{ label: 'Inbox', href: '/inbox' }, { label: summary.title }]} />
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{summary.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {summary.people.length === 0
              ? 'Only You'
              : summary.people.map((person, index) => (
                  <span key={person.userId}>
                    {index > 0 ? ', ' : null}
                    <Link href={`/u/${person.handle}`} className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                      @{person.handle}
                    </Link>
                  </span>
                ))}
          </p>
        </div>
        {/* The designed way out of roleplaying in messages: take it to a scene. */}
        <Link href="/scenes/new" className={buttonClass('secondary')}>
          Start A Scene
        </Link>
      </header>
      {summary.request === 'incoming' ? <RequestBar conversationId={conversationId} name={summary.title} /> : null}
      {summary.request === 'outgoing' ? (
        <p role="status" className="mb-6 max-w-3xl rounded-lg bg-surface-sunken px-4 py-3 text-sm text-ink">
          You do not share a community with {summary.title}, so this is a message request. You can send up to three messages before they
          accept.
        </p>
      ) : null}
      <MessageThread
        page={page}
        href={`/inbox/${conversationId}`}
        viewingEarlier={Boolean(before)}
        emptyText="No messages yet. Say hello."
        placeholder="Write A Message…"
        readOnlyNote="You cannot write in this conversation."
        track
      />
    </>
  );
}
