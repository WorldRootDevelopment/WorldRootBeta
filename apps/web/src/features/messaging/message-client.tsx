'use client';

import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { send } from '@/features/scenes/api';

const inputClass =
  'w-full rounded-lg border border-line-strong bg-surface-raised px-3 py-2.5 text-base text-ink placeholder:text-ink-muted ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';

/** The message box. Enter sends and Shift+Enter makes a new line, as people expect of a message box. */
export function MessageComposer({ conversationId, placeholder }: { conversationId: string; placeholder: string }) {
  const router = useRouter();
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
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing: do not send while an input method is still choosing characters.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor={`message-${conversationId}`} className="sr-only">
        Message
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id={`message-${conversationId}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          maxLength={4000}
          placeholder={placeholder}
          className={`${inputClass} resize-y`}
        />
        <Button type="submit" disabled={pending || !text.trim()}>
          {pending ? 'Sending…' : 'Send'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        <p className="text-xs text-ink-muted">Enter to send, Shift+Enter for a new line.</p>
      )}
    </form>
  );
}

export function RemoveMessageButton({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const remove = async () => {
    if (!window.confirm('Remove this message? A marker stays in its place. This cannot be undone.')) return;
    setPending(true);
    const result = await send('DELETE', `/api/v1/messages/${messageId}`);
    setPending(false);
    if (!result.ok) window.alert(result.message);
    else router.refresh();
  };

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      className="rounded text-xs font-medium text-ink-muted hover:text-ink hover:underline disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {pending ? 'Removing…' : 'Remove'}
    </button>
  );
}

interface ConversationLiveProps {
  conversationId: string;
  /** The newest message shown. Changing it means there is something new to mark as read. */
  latestId: string | null;
  /** Record the viewer's read position. Off for people who are only looking at a community space. */
  track: boolean;
}

/** Keeps an open conversation current over the live event stream, and records that it has been read. */
export function ConversationLive({ conversationId, latestId, track }: ConversationLiveProps) {
  const router = useRouter();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (track && latestId) void send('POST', `/api/v1/conversations/${conversationId}/read`).then(() => router.refresh());
    // The newest message is what the reader came for.
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [router, conversationId, latestId, track]);

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
    return () => stream.close();
  }, [router, conversationId]);

  return <div ref={end} />;
}

/** Start a conversation by handle. Several handles make a group. */
export function NewConversationForm() {
  const router = useRouter();
  const [handles, setHandles] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    const result = await send<{ conversation: { id: string } }>('POST', '/api/v1/conversations', { handles });
    if (!result.ok || !result.data) {
      setPending(false);
      setError(result.fields.handles ?? result.message);
      return;
    }
    router.push(`/inbox/${result.data.conversation.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-2">
      <label htmlFor="new-conversation" className="text-sm font-medium text-ink">
        New message
      </label>
      <div className="flex gap-2">
        <input
          id="new-conversation"
          value={handles}
          onChange={(event) => setHandles(event.target.value)}
          placeholder="@handle"
          autoCapitalize="none"
          spellCheck={false}
          className={`${inputClass} min-h-11 py-0`}
        />
        <Button type="submit" disabled={pending || !handles.trim()}>
          {pending ? 'Opening…' : 'Start'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        <p className="text-sm text-ink-muted">Enter one handle for a direct message, or several separated by spaces for a group of up to 12.</p>
      )}
    </form>
  );
}
