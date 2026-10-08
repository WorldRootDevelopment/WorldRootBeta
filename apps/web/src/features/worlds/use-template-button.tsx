'use client';

import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { send } from '@/features/scenes/api';

/** Copies a template into the viewer's library and opens the new world. */
export function UseTemplateButton({ templateId, name }: { templateId: string; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const use = async () => {
    setPending(true);
    const result = await send<{ world: { id: string } }>('POST', '/api/v1/worlds/from-template', { templateId });
    if (!result.ok || !result.data) {
      setPending(false);
      setError(result.message);
      return;
    }
    router.push(`/worlds/${result.data.world.id}`);
    router.refresh();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={use} disabled={pending} aria-label={`Use the ${name} template`}>
        {pending ? 'Creating…' : 'Use this template'}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
