'use client';

import { Button, TextArea } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';

const note = (ok: boolean) => `rounded-lg px-3 py-2 text-sm ${ok ? 'bg-accent-soft text-accent-text' : 'bg-danger-soft text-danger'}`;

interface SuspensionPanelProps {
  userId: string;
  name: string;
  suspended: boolean;
  /** Why this account cannot be suspended from here, if it cannot. */
  blocked: string | null;
}

/** Suspend an account, giving a reason, or restore one that is suspended. */
export function SuspensionPanel({ userId, name, suspended, blocked }: SuspensionPanelProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = `/api/v1/staff/accounts/${userId}/suspension`;

  const suspend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!window.confirm(`Suspend ${name}? They are signed out at once and cannot use WorldRoot until restored.`)) return;
    setPending(true);
    const result = await send('POST', url, { suspended: true, reason: new FormData(form).get('reason') });
    setPending(false);
    if (!result.ok) return setError(result.fields.reason ?? result.message);
    setError(null);
    router.refresh();
  };

  const restore = async () => {
    setPending(true);
    const result = await send('POST', url, { suspended: false });
    setPending(false);
    if (!result.ok) return setError(result.message);
    setError(null);
    router.refresh();
  };

  if (blocked) return <p className="text-sm text-ink-muted">{blocked}</p>;

  if (suspended) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Button onClick={restore} disabled={pending}>
          {pending ? 'Restoring…' : 'Restore this account'}
        </Button>
        {error ? (
          <p role="alert" className={note(false)}>
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={suspend} className="flex max-w-xl flex-col gap-3">
      <TextArea label="Reason" name="reason" rows={3} maxLength={500} required error={error ?? undefined} hint="Kept in the record, and shown to the person when they try to sign in." />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Suspending…' : 'Suspend this account'}
        </Button>
      </div>
    </form>
  );
}

/** Sign an account out of every device. */
export function SignOutEverywhereButton({ userId, sessions }: { userId: string; sessions: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const signOut = async () => {
    setPending(true);
    const result = await send<{ ended: number }>('DELETE', `/api/v1/staff/accounts/${userId}/sessions`);
    setPending(false);
    setMessage(result.ok ? { ok: true, text: `Signed out of ${result.data?.ended ?? 0} ${result.data?.ended === 1 ? 'device' : 'devices'}.` } : { ok: false, text: result.message ?? 'Could not sign them out.' });
    if (result.ok) router.refresh();
  };

  return (
    <div className="flex flex-col items-start gap-3">
      <Button variant="secondary" onClick={signOut} disabled={pending || sessions === 0}>
        {pending ? 'Signing out…' : 'Sign out of every device'}
      </Button>
      {message ? (
        <p role={message.ok ? 'status' : 'alert'} className={note(message.ok)}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
