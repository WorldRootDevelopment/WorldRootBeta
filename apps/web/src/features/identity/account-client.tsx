'use client';

import type { BlockedPerson } from '@worldroot/core';
import { Button, TextField } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';
import { authClient } from '@/lib/auth-client';

const note = (ok: boolean) => `rounded-lg px-3 py-2 text-sm ${ok ? 'bg-accent-soft text-accent-text' : 'bg-danger-soft text-danger'}`;

/** Change your handle. The old one keeps pointing at you. */
export function HandleForm({ handle, nextChange }: { handle: string; nextChange: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    const result = await send('PATCH', '/api/v1/account/handle', { handle: new FormData(event.currentTarget).get('handle') });
    setPending(false);
    setMessage(result.ok ? { ok: true, text: 'Handle changed. Links to your old handle still work.' } : { ok: false, text: result.fields.handle ?? result.message ?? 'Could not change it.' });
    if (result.ok) router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-3">
      <TextField
        label="Handle"
        name="handle"
        defaultValue={handle}
        maxLength={24}
        autoCapitalize="none"
        spellCheck={false}
        hint={nextChange ? `You can change your handle again on ${nextChange}.` : 'Letters, numbers and underscores. After a change you wait 14 days before the next.'}
      />
      {message ? (
        <p role={message.ok ? 'status' : 'alert'} className={note(message.ok)}>
          {message.text}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        {pending ? 'Saving…' : 'Change handle'}
      </Button>
    </form>
  );
}

/** Change your password. Other devices are signed out, so a stolen session cannot outlive the old password. */
export function PasswordForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const next = String(form.get('next'));
    if (next !== String(form.get('confirm'))) return setMessage({ ok: false, text: 'The two new passwords do not match.' });
    setPending(true);
    const result = await authClient.changePassword({ currentPassword: String(form.get('current')), newPassword: next, revokeOtherSessions: true });
    setPending(false);
    if (result.error) return setMessage({ ok: false, text: result.error.message ?? 'Could not change your password.' });
    formElement.reset();
    setMessage({ ok: true, text: 'Password changed. Your other devices have been signed out.' });
  };

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-3">
      <TextField label="Current Password" name="current" type="password" autoComplete="current-password" required />
      <TextField label="New Password" name="next" type="password" autoComplete="new-password" minLength={10} hint="At least 10 characters." required />
      <TextField label="New Password Again" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      {message ? (
        <p role={message.ok ? 'status' : 'alert'} className={note(message.ok)}>
          {message.text}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        {pending ? 'Changing…' : 'Change password'}
      </Button>
    </form>
  );
}

/** Sign out everywhere except this device. */
export function SessionsPanel() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const signOutOthers = async () => {
    setPending(true);
    const result = await authClient.revokeOtherSessions();
    setPending(false);
    setMessage(result.error ? { ok: false, text: result.error.message ?? 'Could not sign out the other devices.' } : { ok: true, text: 'Every other device has been signed out.' });
  };

  return (
    <div className="flex max-w-md flex-col items-start gap-3">
      <p className="text-sm text-ink-muted">If you signed in somewhere you no longer use, or think someone else has access, sign out everywhere but here.</p>
      {message ? (
        <p role={message.ok ? 'status' : 'alert'} className={note(message.ok)}>
          {message.text}
        </p>
      ) : null}
      <Button variant="secondary" onClick={signOutOthers} disabled={pending}>
        {pending ? 'Signing out…' : 'Sign out other devices'}
      </Button>
    </div>
  );
}

/** The people you have blocked, with a way to unblock each. */
export function BlockedList({ people }: { people: BlockedPerson[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const unblock = async (userId: string) => {
    setBusy(userId);
    await send('DELETE', `/api/v1/blocks/${userId}`);
    setBusy(null);
    router.refresh();
  };

  if (people.length === 0) return <p className="text-sm text-ink-muted">You have not blocked anyone.</p>;
  return (
    <ul className="flex max-w-md flex-col gap-2">
      {people.map((person) => (
        <li key={person.userId} className="flex items-center justify-between gap-3 wr-glass rounded-xl px-4 py-2">
          <span className="min-w-0 truncate text-sm text-ink">
            {person.displayName} <span className="text-ink-muted">@{person.handle}</span>
          </span>
          <Button variant="ghost" onClick={() => unblock(person.userId)} disabled={busy !== null}>
            Unblock
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** On someone's profile: block them, or undo it. */
export function BlockButton({ userId, name, blocked }: { userId: string; name: string; blocked: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    if (!blocked && !window.confirm(`Block ${name}? Neither of you will be able to message the other or invite the other to a private scene. They are not told.`)) return;
    setPending(true);
    await send(blocked ? 'DELETE' : 'POST', `/api/v1/blocks/${userId}`);
    setPending(false);
    router.refresh();
  };

  return (
    <Button variant="ghost" onClick={toggle} disabled={pending}>
      {blocked ? 'Unblock' : 'Block'}
    </Button>
  );
}

/** Shown to the person a message request was sent to. */
export function RequestBar({ conversationId, name }: { conversationId: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const answer = async (action: 'accept' | 'decline') => {
    setPending(true);
    await send('POST', `/api/v1/conversations/${conversationId}/request`, { action });
    if (action === 'decline') router.push('/inbox');
    router.refresh();
    setPending(false);
  };

  return (
    <div role="region" aria-label="Message Request" className="mb-6 max-w-3xl rounded-2xl border border-line-strong bg-surface-sunken p-5">
      <p className="font-medium text-ink">{name} would like to message you.</p>
      <p className="mt-1 text-sm text-ink-muted">
        You do not share a community, so this is a request. If you decline, they are not told, and they cannot write to you again here.
        Replying also accepts.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => answer('accept')} disabled={pending}>
          Accept
        </Button>
        <Button variant="secondary" onClick={() => answer('decline')} disabled={pending}>
          Decline
        </Button>
      </div>
    </div>
  );
}
