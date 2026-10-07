'use client';

import { Button, TextField } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';

const MIN_PASSWORD = 10;

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    setPending(true);
    setError(null);
    const result = await authClient.signUp.email({
      email,
      password: String(form.get('password')),
      // The account name is a placeholder. The display name is chosen at onboarding.
      name: email.split('@')[0] ?? email,
    });
    if (result.error) {
      setError(result.error.message ?? 'Could not create the account.');
      setPending(false);
      return;
    }
    router.push('/welcome');
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <TextField label="Email" name="email" type="email" autoComplete="email" required />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD}
        hint={`At least ${MIN_PASSWORD} characters.`}
        required
      />
      {error ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
