'use client';

import { HANDLE_MAX, HANDLE_MIN, type ApiError } from '@worldroot/contracts';
import { Button, TextField } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function OnboardingForm({ next }: { next: string }) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setFields({});

    const response = await fetch('/api/v1/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        handle: form.get('handle'),
        displayName: form.get('displayName'),
        adultConfirmed: form.get('adultConfirmed') === 'on',
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ApiError | null;
      setFields(body?.error.fields ?? {});
      setError(body?.error.fields ? null : (body?.error.message ?? 'Something went wrong. Try again.'));
      setPending(false);
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <TextField
        label="Handle"
        name="handle"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={HANDLE_MAX}
        hint={`${HANDLE_MIN} to ${HANDLE_MAX} letters, numbers or underscores. This is your unique @name.`}
        error={fields.handle}
        required
      />
      <TextField
        label="Display name"
        name="displayName"
        autoComplete="nickname"
        maxLength={50}
        hint="How other writers see you. You can change it later."
        error={fields.displayName}
        required
      />

      <div className="flex flex-col gap-1.5">
        <label className="flex min-h-11 items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            name="adultConfirmed"
            aria-describedby={fields.adultConfirmed ? 'adult-error' : undefined}
            className="mt-0.5 size-5 shrink-0 accent-accent"
          />
          <span>
            I confirm that I am 18 or older.
            <span className="mt-0.5 block text-ink-muted">WorldRoot is for adults. We record this confirmation and nothing else about your age.</span>
          </span>
        </label>
        {fields.adultConfirmed ? (
          <p id="adult-error" role="alert" className="text-sm text-danger">
            {fields.adultConfirmed}
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Saving…' : 'Continue'}
      </Button>
    </form>
  );
}
