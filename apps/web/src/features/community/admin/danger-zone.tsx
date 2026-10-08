'use client';

import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';

interface DangerZoneProps {
  communityId: string;
  communityName: string;
  archived: boolean;
}

/** Owner-only controls at the foot of General settings: archive or restore, and delete. */
export function DangerZone({ communityId, communityName, archived }: DangerZoneProps) {
  const router = useRouter();
  const [pending, setPending] = useState<'archive' | 'delete' | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const setArchived = async (next: boolean) => {
    if (next && !window.confirm(`Archive ${communityName}? Nobody will be able to post, join or change anything until you restore it.`)) return;
    setPending('archive');
    const result = await send('POST', `/api/v1/communities/${communityId}/archive`, { archived: next });
    setPending(null);
    setError(result.ok ? null : result.message);
    if (result.ok) router.refresh();
  };

  const remove = async (event: FormEvent) => {
    event.preventDefault();
    setPending('delete');
    const result = await send('DELETE', `/api/v1/communities/${communityId}`, { confirmName });
    if (!result.ok) {
      setPending(null);
      setError(result.fields.confirmName ?? result.message);
      return;
    }
    router.push('/communities');
    router.refresh();
  };

  const matches = confirmName.trim().toLowerCase() === communityName.trim().toLowerCase();

  return (
    <section aria-labelledby="danger-zone" className="mt-12 max-w-2xl rounded-2xl border border-danger p-5">
      <h3 id="danger-zone" className="font-serif text-xl font-semibold text-ink">
        Archive or delete
      </h3>

      <div className="mt-5">
        <h4 className="font-medium text-ink">{archived ? 'Restore this community' : 'Archive this community'}</h4>
        <p className="mt-1 text-sm text-ink-muted">
          {archived
            ? 'Restoring reopens it exactly as it was. Members can post, join scenes and add characters again.'
            : 'Archiving freezes the community. Its members can still read everything, but nobody can post, join, start scenes or change anything, and people outside it can no longer find it. Nothing is deleted, and you can restore it at any time.'}
        </p>
        <Button variant="secondary" onClick={() => setArchived(!archived)} disabled={pending !== null} className="mt-3">
          {pending === 'archive' ? 'Working…' : archived ? 'Restore community' : 'Archive community'}
        </Button>
      </div>

      <form onSubmit={remove} className="mt-8 border-t border-line pt-6">
        <h4 className="font-medium text-ink">Delete this community</h4>
        <p className="mt-1 text-sm text-ink-muted">
          Deleting is permanent. It removes the community’s worlds, locations, characters, scenes and every post in them, along with its
          lounge, announcements, roles and invites. Characters and worlds in people’s own libraries are not affected. If you might want
          any of this back, archive instead.
        </p>
        <label htmlFor="confirm-name" className="mt-4 block text-sm font-medium text-ink">
          Type <span className="font-semibold">{communityName}</span> to confirm
        </label>
        <input
          id="confirm-name"
          value={confirmName}
          onChange={(event) => setConfirmName(event.target.value)}
          autoComplete="off"
          className="mt-1.5 min-h-11 w-full max-w-sm rounded-lg border border-line-strong bg-surface-raised px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
        />
        <div className="mt-3">
          <button
            type="submit"
            disabled={!matches || pending !== null}
            className="inline-flex min-h-11 items-center rounded-lg bg-danger px-4 text-sm font-medium text-surface-raised disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {pending === 'delete' ? 'Deleting…' : 'Delete community for good'}
          </button>
        </div>
      </form>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}
