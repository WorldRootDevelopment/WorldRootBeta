'use client';

import { SEASON_KEYS, SEASONS, type SeasonKey } from '@worldroot/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { send } from '@/features/scenes/api';

/** Staff choose the look the whole site wears. It changes for everyone at once. */
export function SeasonPicker({ season: saved }: { season: SeasonKey }) {
  const router = useRouter();
  const [season, setSeason] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (key: SeasonKey) => {
    const before = season;
    setSeason(key);
    setBusy(true);
    setError(null);
    const result = await send('PUT', '/api/v1/staff/season', { season: key });
    setBusy(false);
    if (!result.ok) {
      setSeason(before);
      return setError(result.message);
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Site Look" className="grid max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SEASON_KEYS.map((key) => {
          const chosen = season === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={chosen}
              disabled={busy}
              onClick={() => pick(key)}
              className={`wr-glass flex items-center gap-3 rounded-2xl p-3 text-left hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${chosen ? 'ring-2 ring-accent' : ''}`}
            >
              {/* A swatch of the look's bands. The standard look shows the logo's own two colors. */}
              <span aria-hidden="true" data-season={key} className="wr-season-swatch size-10 shrink-0 rounded-xl border border-line-strong" />
              <span className="min-w-0">
                <span className="block font-display text-sm font-semibold text-ink">
                  {SEASONS[key].label}
                  {chosen ? <span className="ml-2 text-xs font-medium text-accent-text">On now</span> : null}
                </span>
                <span className="block text-xs text-ink-muted">{SEASONS[key].note}</span>
              </span>
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
