'use client';

import type { FriendState } from '@worldroot/core';
import { Button, TextField } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';

/** Runs one friend action and refreshes the page. Returns what the buttons need to show while it runs. */
function useFriendAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (method: 'POST' | 'DELETE', url: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    const result = await send(method, url, body);
    setBusy(false);
    if (!result.ok) return setError(result.fields.handle ?? result.message);
    router.refresh();
  };
  return { busy, error, run };
}

const problem = (error: string | null) =>
  error ? (
    <p role="alert" className="text-sm text-danger">
      {error}
    </p>
  ) : null;

/** Add a friend by their @handle. */
export function AddFriendForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const handle = String(new FormData(form).get('handle') ?? '');
    setPending(true);
    const result = await send<{ state: FriendState }>('POST', '/api/v1/friends', { handle });
    setPending(false);
    if (!result.ok) return setNote({ ok: false, text: result.fields.handle ?? result.message ?? 'Could not send the request.' });
    form.reset();
    setNote({ ok: true, text: result.data?.state === 'friends' ? 'You are now friends.' : 'Request sent.' });
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-wrap items-end gap-3">
      <TextField label="Add A Friend" name="handle" placeholder="@handle" maxLength={40} required autoComplete="off" className="min-w-0 flex-1" />
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Send Request'}
      </Button>
      {note ? (
        <p role={note.ok ? 'status' : 'alert'} className={`basis-full text-sm ${note.ok ? 'text-accent-text' : 'text-danger'}`}>
          {note.text}
        </p>
      ) : null}
    </form>
  );
}

/** On a profile: the one button that fits how you and this person stand. */
export function FriendButton({ userId, handle, state }: { userId: string; handle: string; state: FriendState }) {
  const { busy, error, run } = useFriendAction();
  const url = `/api/v1/friends/${userId}`;
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {state === 'none' ? (
          <Button variant="secondary" disabled={busy} onClick={() => run('POST', '/api/v1/friends', { handle })}>
            Add Friend
          </Button>
        ) : null}
        {state === 'incoming' ? (
          <>
            <Button disabled={busy} onClick={() => run('POST', url)}>
              Accept Friend Request
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => run('DELETE', url)}>
              Decline
            </Button>
          </>
        ) : null}
        {state === 'outgoing' ? (
          <Button variant="ghost" disabled={busy} onClick={() => run('DELETE', url)}>
            Cancel Friend Request
          </Button>
        ) : null}
        {state === 'friends' ? (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Stop being friends? They are not told.')) void run('DELETE', url);
            }}
          >
            Friends · Remove
          </Button>
        ) : null}
      </div>
      {problem(error)}
    </div>
  );
}

/** In the friends list: what you can do about one person. */
export function FriendRowActions({ userId, kind }: { userId: string; kind: 'friend' | 'incoming' | 'outgoing' }) {
  const { busy, error, run } = useFriendAction();
  const url = `/api/v1/friends/${userId}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {kind === 'incoming' ? (
        <>
          <Button disabled={busy} onClick={() => run('POST', url)}>
            Accept
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => run('DELETE', url)}>
            Decline
          </Button>
        </>
      ) : null}
      {kind === 'outgoing' ? (
        <Button variant="ghost" disabled={busy} onClick={() => run('DELETE', url)}>
          Cancel
        </Button>
      ) : null}
      {kind === 'friend' ? (
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            if (window.confirm('Stop being friends? They are not told.')) void run('DELETE', url);
          }}
        >
          Remove
        </Button>
      ) : null}
      {problem(error)}
    </div>
  );
}
