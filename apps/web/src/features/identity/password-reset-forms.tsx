'use client';

import { Button, TextField } from '@worldroot/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';
import { textLinkClass } from './auth-card';

/** Asks for a reset link. The answer is the same whether or not the address has an account, so it tells nobody who is signed up. */
export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    if (!email) return setError('Enter your email address.');
    setPending(true);
    setError(null);
    const result = await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' });
    setPending(false);
    // Too many requests is the one failure worth saying; anything else looks the same as success.
    if (result.error?.status === 429) return setError('Too many requests. Wait a few minutes and try again.');
    setSent(true);
  };

  if (sent) {
    return (
      <p role="status" className="rounded-lg bg-accent-soft px-4 py-3 text-ink">
        If an account uses that address, a link to choose a new password is on its way. It works for one hour. Check your spam folder if it
        does not arrive.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <TextField label="Email" name="email" type="email" autoComplete="email" required />
      {error ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Sending…' : 'Send Reset Link'}
      </Button>
    </form>
  );
}

/** Chooses a new password with the token from the emailed link. */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    if (password.length < 10) return setError('Use at least 10 characters.');
    if (password !== String(form.get('confirm') ?? '')) return setError('The two passwords do not match.');
    setPending(true);
    setError(null);
    const result = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (result.error) return setError('This link has expired or was already used. Ask for a new one.');
    setDone(true);
    router.refresh();
  };

  if (done) {
    return (
      <div role="status" className="flex flex-col gap-4">
        <p className="rounded-lg bg-accent-soft px-4 py-3 text-ink">Your password is changed, and every device was signed out. Sign in with the new one.</p>
        <Link href="/sign-in" className={textLinkClass}>
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <TextField label="New Password" name="password" type="password" autoComplete="new-password" minLength={10} required hint="At least 10 characters." />
      <TextField label="New Password Again" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      {error ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Saving…' : 'Save New Password'}
      </Button>
    </form>
  );
}

/** On the Account page: send the confirmation email again. */
export function ResendVerification({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const resend = async () => {
    setState('sending');
    const result = await authClient.sendVerificationEmail({ email, callbackURL: '/settings/account?verified=1' });
    setState(result.error ? 'failed' : 'sent');
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <Button variant="secondary" onClick={resend} disabled={state === 'sending' || state === 'sent'}>
        {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Sent' : 'Send Confirmation Email'}
      </Button>
      <span aria-live="polite" className="text-sm text-ink-muted">
        {state === 'sent' ? 'Check your inbox, and your spam folder, for a link.' : state === 'failed' ? 'Could not send it. Wait a few minutes and try again.' : ''}
      </span>
    </span>
  );
}
