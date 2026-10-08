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

const fieldClass =
  'min-h-11 w-full rounded-lg border border-line-strong bg-surface-raised px-3 text-base text-ink placeholder:text-ink-muted ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';

/**
 * Adds a world to a community, for those who hold "Add worlds". The world
 * comes from the viewer's own library, or from an ID another writer shared.
 */
export function AddWorldForm({ communityId, communityName, worlds }: AddWorldFormProps) {
  const router = useRouter();
  const [source, setSource] = useState<'library' | 'id'>(worlds.length > 0 ? 'library' : 'id');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    setAdded(null);
    const result = await send<{ world: { name: string } }>(
      'POST',
      `/api/v1/communities/${communityId}/worlds`,
      source === 'library' ? { worldId: form.get('worldId') } : { shareCode: form.get('shareCode') },
    );
    setPending(false);
    if (!result.ok) return setError(result.fields.worldId ?? result.message);
    setError(null);
    setAdded(result.data?.world.name ?? 'The world');
    formElement.reset();
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="mt-8 flex max-w-2xl flex-col gap-4 rounded-2xl border border-dashed border-line-strong p-5">
      <h3 className="font-serif text-lg font-semibold text-ink">Add a world</h3>

      <fieldset className="flex flex-col">
        <legend className="sr-only">Where the world comes from</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
          <input type="radio" name="source" checked={source === 'library'} onChange={() => setSource('library')} className="size-5 accent-accent" />
          From my library
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
          <input type="radio" name="source" checked={source === 'id'} onChange={() => setSource('id')} className="size-5 accent-accent" />
          From a world ID someone shared with me
        </label>
      </fieldset>

      {source === 'library' ? (
        worlds.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Your library has no worlds yet.{' '}
            <Link href="/library/worlds/new" className="font-medium text-accent-text underline underline-offset-2 hover:no-underline">
              Create a world
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="add-world" className="text-sm font-medium text-ink">
              World
            </label>
            <select id="add-world" name="worldId" className={`${fieldClass} font-serif font-semibold`}>
              {worlds.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.name}
                </option>
              ))}
            </select>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="add-world-id" className="text-sm font-medium text-ink">
            World ID
          </label>
          <input
            id="add-world-id"
            name="shareCode"
            placeholder="XXXX-XXXX"
            autoCapitalize="characters"
            spellCheck={false}
            className={`${fieldClass} max-w-xs font-mono uppercase tracking-widest`}
          />
          <p className="text-sm text-ink-muted">A world’s owner creates its ID from the world’s page in their library.</p>
        </div>
      )}

      <p className="text-sm text-ink-muted">
        {communityName} receives its own copy, with every location, and keeps it. The original stays with its owner, and later changes to
        either do not reach the other.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {added ? (
        <p role="status" className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-text">
          {added} was added.
        </p>
      ) : null}
      <Button type="submit" disabled={pending || (source === 'library' && worlds.length === 0)} className="self-start">
        {pending ? 'Adding…' : `Add to ${communityName}`}
      </Button>
    </form>
  );
}
