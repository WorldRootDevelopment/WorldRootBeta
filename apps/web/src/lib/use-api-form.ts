'use client';

import type { ApiError } from '@worldroot/contracts';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

interface ApiFormOptions<T> {
  method: 'POST' | 'PATCH';
  url: string;
  /** Extra values sent with the form's own fields. */
  extra?: Record<string, unknown>;
  /** Where to go after a successful save, given the response body. */
  next: (body: T) => string;
}

/**
 * Submits a form's fields as JSON to an API route. Field errors from the
 * error envelope are returned by field name; anything else becomes one message.
 */
export function useApiForm<T>({ method, url, extra, next }: ApiFormOptions<T>) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setPending(true);
    setError(null);
    setFields({});

    const response = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...values, ...extra }),
    }).catch(() => null);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as ApiError | null;
      setFields(body?.error.fields ?? {});
      setError(body?.error.fields ? 'Check the highlighted fields.' : (body?.error.message ?? 'Could not save. Check your connection and try again.'));
      setPending(false);
      return;
    }

    router.push(next((await response.json()) as T));
    router.refresh();
  };

  return { onSubmit, fields, error, pending };
}
