import type { MessagePage } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import Link from 'next/link';
import { Badges } from '@/features/identity/badges';
import { ChatComposer, ChatLog } from './chat-client';
import { ReportButton } from '@/features/moderation/report-client';
import { RemoveMessageButton } from './message-client';

type Message = MessagePage['messages'][number];

const GROUP_GAP_MS = 5 * 60_000;

const time = (date: Date) => date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
const dayKey = (date: Date) => date.toDateString();
const dayLabel = (date: Date) => date.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** A message continues the one above when the same person wrote both within a few minutes. */
const continues = (message: Message, previous: Message | undefined) =>
  Boolean(previous) &&
  !previous!.removedBy &&
  !message.removedBy &&
  previous!.authorUserId === message.authorUserId &&
  message.createdAt.getTime() - previous!.createdAt.getTime() < GROUP_GAP_MS &&
  dayKey(previous!.createdAt) === dayKey(message.createdAt);

function Avatar({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-text">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function ChatMessage({ message, previous, canModerate }: { message: Message; previous: Message | undefined; canModerate: boolean }) {
  const newDay = !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
  const divider = newDay ? (
    <li aria-hidden="true" className="my-3 flex items-center gap-3 text-xs text-ink-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
      {dayLabel(message.createdAt)}
    </li>
  ) : null;

  if (message.removedBy) {
    return (
      <>
        {divider}
        <li className="py-1 pl-12 text-sm italic text-ink-muted">
          {message.removedBy === 'author' ? 'Message removed by its author.' : 'Message removed by a moderator.'}
        </li>
      </>
    );
  }

  const name = message.authorName ?? 'Former Member';
  const remove = (
    <span className="inline-flex items-center gap-3">
      {message.mine || canModerate ? <RemoveMessageButton messageId={message.id} /> : null}
      {message.mine ? null : <ReportButton targetType="message" targetId={message.id} />}
    </span>
  );

  if (continues(message, previous)) {
    return (
      <li className="group flex items-baseline gap-3 rounded py-0.5 hover:bg-surface-sunken">
        {/* The time takes the avatar's column and shows when the row is hovered or focused. */}
        <time dateTime={message.createdAt.toISOString()} className="w-9 shrink-0 text-center text-[0.625rem] text-ink-muted opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
          {time(message.createdAt)}
        </time>
        <p className="min-w-0 flex-1 whitespace-pre-line break-words text-ink">{message.body}</p>
        <span className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">{remove}</span>
      </li>
    );
  }

  return (
    <>
      {divider}
      <li className="group mt-3 flex gap-3 rounded py-0.5 first:mt-0 hover:bg-surface-sunken">
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            {message.authorHandle ? (
              <Link href={`/u/${message.authorHandle}`} className="font-medium text-ink rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                {name}
              </Link>
            ) : (
              <span className="font-medium text-ink">{name}</span>
            )}
            <Badges list={message.authorBadges} community={message.authorCommunityBadge} />
            <time dateTime={message.createdAt.toISOString()} className="text-xs text-ink-muted">
              {time(message.createdAt)}
            </time>
            <span className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">{remove}</span>
          </div>
          <p className="whitespace-pre-line break-words text-ink">{message.body}</p>
        </div>
      </li>
    </>
  );
}

interface ChatRoomProps {
  page: MessagePage;
  /** This page's own address, for the "earlier messages" link. */
  href: string;
  viewingEarlier: boolean;
  placeholder: string;
  /** Shown in place of the message box to someone who may read but not post. */
  readOnlyNote: string;
  track: boolean;
}

/** A community's Lounge: a live chat room. The member list stands beside every page of the community. */
export function ChatRoom({ page, href, viewingEarlier, placeholder, readOnlyNote, track }: ChatRoomProps) {
  const { conversation, messages, hasEarlier, canPost, canModerate } = page;
  return (
    <div>
      <section aria-label="Lounge Chat" className="flex h-[calc(100dvh-25rem)] min-h-[26rem] flex-col overflow-hidden wr-glass rounded-2xl">
        <ChatLog conversationId={conversation.id} latestId={viewingEarlier ? null : (messages.at(-1)?.id ?? null)} track={track && !viewingEarlier}>
          {hasEarlier && messages[0] ? (
            <p className="mb-3 text-center">
              <Link href={`${href}?before=${messages[0].id}`} className={buttonClass('ghost')}>
                Earlier Messages
              </Link>
            </p>
          ) : null}
          {messages.length === 0 ? (
            <p className="py-10 text-center text-ink-muted">It is quiet in here. Say hello.</p>
          ) : (
            <ol>
              {messages.map((message, index) => (
                <ChatMessage key={message.id} message={message} previous={messages[index - 1]} canModerate={canModerate} />
              ))}
            </ol>
          )}
        </ChatLog>

        <div className="border-t border-line p-3">
          {viewingEarlier ? (
            <Link href={href} className={buttonClass('secondary')}>
              Back To The Latest Messages
            </Link>
          ) : canPost ? (
            <ChatComposer conversationId={conversation.id} placeholder={placeholder} />
          ) : (
            <p className="px-1 py-2 text-sm text-ink-muted">{readOnlyNote}</p>
          )}
        </div>
      </section>

    </div>
  );
}
