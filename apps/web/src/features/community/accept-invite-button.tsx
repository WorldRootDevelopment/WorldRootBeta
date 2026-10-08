'use client';

import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { send } from '@/features/scenes/api';

export function AcceptInviteButton({ code, communityName }: { code: string; communityName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setPending(true);
    const result = await send<{ community: { slug: string } }>('POST', '/api/v1/invites/accept', { code });
    if (!result.ok || !result.data) {
      setPending(false);
      setError(result.message);
      return;
    }
    router.push(`/c/${result.data.community.slug}`);
    router.refresh();
  };

  return (
    <div className="flex flex-col items-start gap-3">
      <Button size="lg" onClick={accept} disabled={pending}>
        {pending ? 'Joining…' : `Join ${communityName}`}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
