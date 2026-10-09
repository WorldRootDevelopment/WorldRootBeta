'use client';

import type { ApiError } from '@worldroot/contracts';
import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function JoinButton({ communityId }: { communityId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/v1/communities/${communityId}/members`, { method: 'POST' });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ApiError | null;
      setError(body?.error.message ?? 'Could not join. Try again.');
      setPending(false);
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={join} disabled={pending}>
        {pending ? 'Joining…' : 'Join Community'}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
