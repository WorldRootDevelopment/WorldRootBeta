'use client';

import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { send } from '@/features/scenes/api';

/** How close to the bottom still counts as "following the conversation". */
const FOLLOW_THRESHOLD_PX = 120;
/** How often the room re-checks who is online. New messages arrive at once over the event stream. */
const PRESENCE_REFRESH_MS = 30_000;

interface ChatLogProps {
  conversationId: string;
  /** The newest message shown. A change means something arrived. */
  latestId: string | null;
  /** Record the viewer's read position. Off for visitors who are only looking. */
  track: boolean;
  children: ReactNode;
}

/**
 * The scrolling message area of a chat room. It opens at the newest message
 * and follows new ones as they arrive, unless the reader has scrolled up to
 * read back, in which case it stays put and offers a way down.
 */
export function ChatLog({ conversationId, latestId, track, children }: ChatLogProps) {
  const router = useRouter();
  const log = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const [behind, setBehind] = useState(false);

  const toBottom = () => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
    following.current = true;
    setBehind(false);
  };

  useEffect(() => {
    if (following.current) toBottom();
    else setBehind(true);
    if (track && latestId) void send('POST', `/api/v1/conversations/${conversationId}/read`);
  }, [conversationId, latestId, track]);

  useEffect(() => {
    const refresh = () => router.refresh();
    const stream = new EventSource(`/api/v1/events?conversation=${conversationId}`);
    let opened = false;
    stream.onopen = () => {
      if (opened) refresh();
      opened = true;
    };
    stream.addEventListener('message.created', refresh);
    stream.addEventListener('message.updated', refresh);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, PRESENCE_REFRESH_MS);
    return () => {
      stream.close();
      clearInterval(timer);
    };
  }, [router, conversationId]);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={log}
        role="log"
        aria-label="Messages"
        tabIndex={0}
        onScroll={(event) => {
          const element = event.currentTarget;
          following.current = element.scrollHeight - element.scrollTop - element.clientHeight < FOLLOW_THRESHOLD_PX;
          if (following.current) setBehind(false);
        }}
        className="h-full overflow-y-auto px-4 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
      >
        {children}
      </div>
      {behind ? (
        <button
          type="button"
          onClick={toBottom}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 wr-gloss rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          New Messages ↓
        </button>
      ) : null}
    </div>
  );
}

/** The chat room's message box: one line that grows, Enter to send. */
export function ChatComposer({ conversationId, placeholder }: { conversationId: string; placeholder: string }) {
  const router = useRouter();
  const box = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!text.trim() || pending) return;
    setPending(true);
    const result = await send('POST', `/api/v1/conversations/${conversationId}/messages`, { body: text });
    setPending(false);
    if (!result.ok) return setError(result.fields.body ?? result.message);
    setText('');
    setError(null);
    router.refresh();
    box.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing: do not send while an input method is still choosing characters.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form onSubmit={submit}>
      <label htmlFor={`chat-${conversationId}`} className="sr-only">
        Message. Enter sends, Shift and Enter makes a new line.
      </label>
      <div className="flex items-end gap-2">
        <textarea
          ref={box}
          id={`chat-${conversationId}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          rows={Math.min(6, Math.max(1, text.split('\n').length))}
          maxLength={4000}
          placeholder={placeholder}
          className="min-h-11 w-full resize-none rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-base text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
        />
        <Button type="submit" disabled={pending || !text.trim()}>
          Send
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
