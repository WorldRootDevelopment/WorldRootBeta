import type { MessagePage } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import Link from 'next/link';
import { ConversationLive, MessageComposer, RemoveMessageButton } from './message-client';

const when = (date: Date) => date.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });

interface MessageThreadProps {
  page: MessagePage;
  /** This page's own address, for the "earlier messages" link. */
  href: string;
  /** True when an earlier page is being shown, so the composer and read tracking are held back. */
  viewingEarlier: boolean;
  emptyText: string;
  placeholder: string;
  /** Shown in place of the message box to someone who may read but not post. */
  readOnlyNote: string;
  /** Whether to record the viewer's read position. */
  track: boolean;
}

/** A conversation: its messages oldest first, then the message box. Shared by direct messages and community spaces. */
export function MessageThread({ page, href, viewingEarlier, emptyText, placeholder, readOnlyNote, track }: MessageThreadProps) {
  const { conversation, messages, hasEarlier, canPost, canModerate } = page;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {hasEarlier && messages[0] ? (
        <p>
          <Link href={`${href}?before=${messages[0].id}`} className={buttonClass('secondary')}>
            Earlier messages
          </Link>
        </p>
      ) : null}

      {messages.length === 0 ? (
        <p className="text-ink-muted">{emptyText}</p>
      ) : (
        <ol className="flex flex-col gap-5">
          {messages.map((message) => (
            <li key={message.id}>
              {message.removedBy ? (
                <p className="text-sm italic text-ink-muted">
                  {message.removedBy === 'author' ? 'This message was removed by its author.' : 'This message was removed by a moderator.'}
                </p>
              ) : (
                <>
                  <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-ink-muted">
                    <span className="text-sm font-medium text-ink">{message.authorName ?? 'Former member'}</span>
                    {message.authorHandle ? <span>@{message.authorHandle}</span> : null}
                    <time dateTime={message.createdAt.toISOString()}>{when(message.createdAt)}</time>
                    {message.mine || canModerate ? <RemoveMessageButton messageId={message.id} /> : null}
                  </p>
                  <p className="mt-1 whitespace-pre-line break-words text-ink">{message.body}</p>
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      {viewingEarlier ? (
        <p>
          <Link href={href} className={buttonClass('secondary')}>
            Jump to the latest messages
          </Link>
        </p>
      ) : (
        <>
          <ConversationLive conversationId={conversation.id} latestId={messages.at(-1)?.id ?? null} track={track} />
          <div className="border-t border-line pt-5">
            {canPost ? <MessageComposer conversationId={conversation.id} placeholder={placeholder} /> : <p className="text-sm text-ink-muted">{readOnlyNote}</p>}
          </div>
        </>
      )}
    </div>
  );
}
