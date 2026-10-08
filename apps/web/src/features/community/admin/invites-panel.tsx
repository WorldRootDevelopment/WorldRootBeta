'use client';

import type { InviteRow } from '@worldroot/core';
import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';

const selectClass =
  'min-h-11 rounded-lg border border-line-strong bg-surface-raised px-3 text-base text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';

const STATE_LABELS: Record<InviteRow['state'], string> = {
  active: 'Active',
  revoked: 'Revoked',
  expired: 'Expired',
  used_up: 'Used up',
};

const day = (date: Date) => date.toLocaleDateString('en', { dateStyle: 'medium' });

function InviteLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  // Built in the browser so the link always carries the address the person is using.
  const url = typeof window === 'undefined' ? `/invite/${code}` : `${window.location.origin}/invite/${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused. The link is shown so it can be copied by hand.
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code suppressHydrationWarning className="min-w-0 break-all rounded-lg bg-surface-sunken px-3 py-2 text-sm text-ink">
        {url}
      </code>
      <Button variant="secondary" onClick={copy}>
        {copied ? 'Copied' : 'Copy link'}
      </Button>
    </div>
  );
}

/** Create invite links, see how each has been used, and revoke them. */
export function InvitesPanel({ communityId, invites }: { communityId: string; invites: InviteRow[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const number = (name: string) => Number(form.get(name)) || null;
    setPending(true);
    const result = await send('POST', `/api/v1/communities/${communityId}/invites`, {
      maxUses: number('maxUses'),
      expiresInDays: number('expiresInDays'),
    });
    setPending(false);
    setError(result.ok ? null : result.message);
    if (result.ok) router.refresh();
  };

  const revoke = async (invite: InviteRow) => {
    if (!window.confirm('Revoke this link? It stops working at once. People who already joined stay.')) return;
    const result = await send('DELETE', `/api/v1/invites/${invite.id}`);
    setError(result.ok ? null : result.message);
    if (result.ok) router.refresh();
  };

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={create} className="flex max-w-2xl flex-col gap-4 rounded-2xl border border-dashed border-line-strong p-5">
        <h3 className="font-serif text-lg font-semibold text-ink">New invite link</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expiresInDays" className="text-sm font-medium text-ink">
              Expires
            </label>
            <select id="expiresInDays" name="expiresInDays" defaultValue="7" className={selectClass}>
              <option value="1">After 1 day</option>
              <option value="7">After 7 days</option>
              <option value="30">After 30 days</option>
              <option value="">Never</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="maxUses" className="text-sm font-medium text-ink">
              Can be used
            </label>
            <select id="maxUses" name="maxUses" defaultValue="" className={selectClass}>
              <option value="">Any number of times</option>
              <option value="1">Once</option>
              <option value="5">5 times</option>
              <option value="25">25 times</option>
              <option value="100">100 times</option>
            </select>
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? 'Creating…' : 'Create link'}
        </Button>
      </form>

      {invites.length === 0 ? (
        <p className="text-ink-muted">No invite links yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {invites.map((invite) => (
            <li key={invite.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-5">
              {invite.state === 'active' ? <InviteLink code={invite.code} /> : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-muted">
                  <span className={invite.state === 'active' ? 'font-medium text-accent-text' : 'font-medium text-ink'}>
                    {STATE_LABELS[invite.state]}
                  </span>
                  {' · '}
                  Used {invite.uses}
                  {invite.maxUses ? ` of ${invite.maxUses}` : ''} {invite.uses === 1 && !invite.maxUses ? 'time' : 'times'}
                  {' · '}
                  {invite.expiresAt ? `Expires ${day(invite.expiresAt)}` : 'Does not expire'}
                  {invite.createdByHandle ? ` · Made by @${invite.createdByHandle}` : ''}
                </p>
                {invite.state === 'active' ? (
                  <Button variant="ghost" onClick={() => revoke(invite)}>
                    Revoke
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
