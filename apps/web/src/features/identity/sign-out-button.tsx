'use client';

import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

/** Signs out and returns to the landing page. */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const signOut = async () => {
    setPending(true);
    await authClient.signOut();
    router.push('/');
    router.refresh();
  };
  return (
    <Button variant="secondary" onClick={signOut} disabled={pending}>
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
