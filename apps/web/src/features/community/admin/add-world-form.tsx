'use client';

import { Button } from '@worldroot/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';

interface AddWorldFormProps {
  communityId: string;
  communityName: string;
  /** The viewer's library worlds. */
  worlds: Array<{ id: string; name: string }>;
}

/** Copy one of your library worlds into the community. */
export function AddWorldForm({ communityId, communityName, worlds }: AddWorldFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const worldId = new FormData(event.currentTarget).get('worldId');
    setPending(true);
    const result = await send('POST', `/api/v1/communities/${communityId}/worlds`, { worldId });
    setPending(false);
    setError(result.ok ? null : result.message);
    if (result.ok) router.refresh();
  };

  return (
    <form onSubmit={submit} className="mt-8 flex max-w-2xl flex-col gap-3 rounded-2xl border border-dashed border-line-strong p-5">
      <h3 className="font-serif text-lg font-semibold text-ink">Add a world</h3>
      {worlds.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Worlds are built in your library, then added here.{' '}
          <Link href="/library/worlds/new" className="font-medium text-accent-text underline underline-offset-2 hover:no-underline">
            Create a world
          </Link>
        </p>
      ) : (
        <>
          <label htmlFor="add-world" className="text-sm font-medium text-ink">
            From your library
          </label>
          <select
            id="add-world"
            name="worldId"
            className="min-h-11 rounded-lg border border-line-strong bg-surface-raised px-3 font-serif text-base font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
          >
            {worlds.map((world) => (
              <option key={world.id} value={world.id}>
                {world.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-ink-muted">
            {communityName} receives its own copy, with every location, and keeps it. Your original stays in your library, and later
            changes to either do not reach the other.
          </p>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? 'Adding…' : `Add to ${communityName}`}
          </Button>
        </>
      )}
    </form>
  );
}
