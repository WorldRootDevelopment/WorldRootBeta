'use client';

import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';

/** On a library world's page: switch sharing on to get an ID, copy it, or switch it off. */
export function WorldSharingPanel({ worldId, shareCode }: { worldId: string; shareCode: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = async (shared: boolean) => {
    if (!shared && !window.confirm('Stop sharing? The ID stops working at once. Copies already made are not affected.')) return;
    setPending(true);
    const result = await send('POST', `/api/v1/worlds/${worldId}/share`, { shared });
    setPending(false);
    setError(result.ok ? null : result.message);
    if (result.ok) router.refresh();
  };

  const copy = async () => {
    if (!shareCode) return;
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused. The ID is shown so it can be copied by hand.
    }
  };

  return (
    <section className="mt-12 max-w-2xl wr-glass rounded-2xl p-5">
      <h2 className="font-display text-xl font-semibold text-ink">Share this world</h2>
      {shareCode ? (
        <>
          <p className="mt-2 text-sm text-ink-muted">
            Anyone you give this ID to can take their own copy, into their library or into a community they run. Their copy is theirs to
            change. Yours is never altered.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code className="rounded-lg bg-surface-sunken px-4 py-2.5 font-mono text-lg font-semibold tracking-widest text-ink">{shareCode}</code>
            <Button variant="secondary" onClick={copy}>
              {copied ? 'Copied' : 'Copy ID'}
            </Button>
            <Button variant="ghost" onClick={() => set(false)} disabled={pending}>
              Stop sharing
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-muted">
            This world is private. Sharing gives it an ID you can pass to other people, so they can take their own copy of it, for example
            to add it to a community they run.
          </p>
          <Button variant="secondary" onClick={() => set(true)} disabled={pending} className="mt-4">
            {pending ? 'Creating ID…' : 'Create a world ID'}
          </Button>
        </>
      )}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}

/** On the Library page: take a copy of a world someone shared with you. */
export function ImportWorldForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    const result = await send<{ world: { id: string } }>('POST', '/api/v1/worlds/import', { worldId: code });
    if (!result.ok || !result.data) {
      setPending(false);
      setError(result.fields.worldId ?? result.message);
      return;
    }
    router.push(`/worlds/${result.data.world.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-2">
      <label htmlFor="import-world" className="text-sm font-medium text-ink">
        Have a world ID?
      </label>
      <div className="flex gap-2">
        <input
          id="import-world"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="XXXX-XXXX"
          autoCapitalize="characters"
          spellCheck={false}
          className="min-h-11 w-full rounded-lg border border-line-strong bg-surface-raised px-3 font-mono text-base uppercase tracking-widest text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
        />
        <Button type="submit" variant="secondary" disabled={pending || !code.trim()}>
          {pending ? 'Copying…' : 'Add copy'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        <p className="text-sm text-ink-muted">Adds your own copy of a world someone shared with you.</p>
      )}
    </form>
  );
}
