'use client';

import { BADGES, GRANTABLE_BADGES, STORE_ITEMS, type BadgeKey } from '@worldroot/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { send } from '@/features/scenes/api';

const toggle = (on: boolean) =>
  'inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ' +
  (on ? 'border-accent bg-accent-soft text-accent-text' : 'border-line-strong bg-surface-raised text-ink-muted hover:text-ink');

/** Staff controls for one account: each store item, given or taken back by hand. */
export function ItemControls({ userId, owned }: { userId: string; owned: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (item: string, has: boolean) => {
    setBusy(true);
    const result = await send('POST', `/api/v1/staff/accounts/${userId}/items`, { item, owned: has });
    setBusy(false);
    setError(result.ok ? null : result.message);
    if (result.ok) router.refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {STORE_ITEMS.map((item) => {
          const has = owned.includes(item.key);
          return (
            <button key={item.key} type="button" aria-pressed={has} disabled={busy} onClick={() => change(item.key, !has)} className={toggle(has)}>
              {item.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Staff controls for one account: Heartwood, and each badge that is granted by hand. */
export function AccountControls({ userId, badges }: { userId: string; badges: BadgeKey[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (url: string, body: unknown) => {
    setBusy(true);
    const result = await send('POST', url, body);
    setBusy(false);
    setError(result.ok ? null : result.message);
    if (result.ok) router.refresh();
  };

  const premium = badges.includes('premium');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={premium}
          disabled={busy}
          onClick={() => change(`/api/v1/staff/accounts/${userId}/premium`, { premium: !premium })}
          className={toggle(premium)}
        >
          {BADGES.premium.label}
        </button>
        {GRANTABLE_BADGES.map((key) => {
          const held = badges.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={held}
              disabled={busy}
              onClick={() => change(`/api/v1/staff/accounts/${userId}/badges`, { badge: key, granted: !held })}
              className={toggle(held)}
            >
              {BADGES[key].label}
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
