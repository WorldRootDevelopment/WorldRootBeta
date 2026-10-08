import type { MessagePage, PresenceRow } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import Link from 'next/link';
import { ChatComposer, ChatLog } from './chat-client';
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

  const name = message.authorName ?? 'Former member';
  const remove = message.mine || canModerate ? <RemoveMessageButton messageId={message.id} /> : null;

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
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium text-ink">{name}</span>
            <time dateTime={message.createdAt.toISOString()} className="text-xs text-ink-muted">
              {time(message.createdAt)}
            </time>
            <span className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">{remove}</span>
          </p>
          <p className="whitespace-pre-line break-words text-ink">{message.body}</p>
        </div>
      </li>
    </>
  );
}

function MemberList({ title, members }: { title: string; members: PresenceRow[] }) {
  if (members.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
        {title} — {members.length}
      </h3>
      <ul className="flex flex-col gap-1">
        {members.map((member) => (
          <li key={member.userId} className={`flex items-center gap-2.5 rounded-lg px-1.5 py-1 ${member.online ? '' : 'opacity-60'}`}>
            <span className="relative">
              <Avatar name={member.displayName} />
              {/* The dot repeats what the section heading already says, so status never rests on colour alone. */}
              <span
                aria-hidden="true"
                className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-surface-raised ${member.online ? 'bg-online' : 'bg-line-strong'}`}
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">{member.displayName}</span>
              {member.role ? <span className="block truncate text-xs text-ink-muted">{member.role}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ChatRoomProps {
  page: MessagePage;
  members: PresenceRow[];
  /** This page's own address, for the "earlier messages" link. */
  href: string;
  viewingEarlier: boolean;
  placeholder: string;
  /** Shown in place of the message box to someone who may read but not post. */
  readOnlyNote: string;
  track: boolean;
}

/** A community's Lounge: a live chat room with the member list beside it, showing who is online. */
export function ChatRoom({ page, members, href, viewingEarlier, placeholder, readOnlyNote, track }: ChatRoomProps) {
  const { conversation, messages, hasEarlier, canPost, canModerate } = page;
  const online = members.filter((member) => member.online);
  const offline = members.filter((member) => !member.online);
  const lists = (
    <div className="flex flex-col gap-5">
      <MemberList title="Online" members={online} />
      <MemberList title="Offline" members={offline} />
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
      {/* Below the wide layout the member list folds away above the room. */}
      <details className="rounded-2xl border border-line bg-surface-raised lg:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-online" />
          {online.length} online
          <span className="font-normal text-ink-muted">
            · {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </summary>
        <div className="max-h-72 overflow-y-auto border-t border-line p-4">{lists}</div>
      </details>

      <section aria-label="Lounge chat" className="flex h-[calc(100dvh-25rem)] min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-line bg-surface-raised">
        <ChatLog conversationId={conversation.id} latestId={viewingEarlier ? null : (messages.at(-1)?.id ?? null)} track={track && !viewingEarlier}>
          {hasEarlier && messages[0] ? (
            <p className="mb-3 text-center">
              <Link href={`${href}?before=${messages[0].id}`} className={buttonClass('ghost')}>
                Earlier messages
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
              Back to the latest messages
            </Link>
          ) : canPost ? (
            <ChatComposer conversationId={conversation.id} placeholder={placeholder} />
          ) : (
            <p className="px-1 py-2 text-sm text-ink-muted">{readOnlyNote}</p>
          )}
        </div>
      </section>

      <aside aria-label="Members" className="hidden h-[calc(100dvh-25rem)] min-h-[26rem] overflow-y-auto rounded-2xl border border-line bg-surface-raised p-4 lg:block">
        {lists}
      </aside>
    </div>
  );
}
