'use client';

import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

/**
 * Signs the visitor in to the shared guest account with one press. The
 * password is not a secret: the account exists so that anyone can use it, and
 * the server limits what it can do.
 */
export function DemoSignIn({ email, password }: { email: string; password: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setPending(true);
    setError(null);
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      setPending(false);
      setError('The demo is not available right now. You can still create an account.');
      return;
    }
    router.push('/c/demo-town');
    router.refresh();
  };

  return (
    <section id="demo" aria-label="Try The Demo" className="wr-glass mt-8 rounded-2xl p-4">
      <h2 className="font-display text-lg font-semibold text-ink">Just Looking?</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        Try WorldRoot without signing up. The demo account is shared: everyone using it appears as Demo Guest, and anything you write
        there can be seen and changed by others. It can write in the demo communities and make characters and worlds. Please do not put
        anything private in it.
      </p>
      <Button variant="secondary" className="mt-3" onClick={start} disabled={pending}>
        {pending ? 'Opening The Demo…' : 'Try The Demo'}
      </Button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}
