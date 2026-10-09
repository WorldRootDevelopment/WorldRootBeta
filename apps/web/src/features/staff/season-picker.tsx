'use client';

import { SEASON_CALENDAR, SEASON_KEYS, SEASONS, type SeasonKey, type SeasonMode } from '@worldroot/contracts';
import { CalendarClock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { send } from '@/features/scenes/api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = ([month, date]: [number, number]) => `${MONTHS[month - 1]} ${date}`;

const card = (chosen: boolean) =>
  `wr-glass flex items-center gap-3 rounded-2xl p-3 text-left hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${chosen ? 'ring-2 ring-accent' : ''}`;

interface SeasonPickerProps {
  /** What staff have chosen: a look held on, or `auto`. */
  mode: SeasonMode;
  /** The look showing right now. Under `auto` this is what the calendar calls for today. */
  showing: SeasonKey;
}

/** Staff choose the look the whole site wears: let the calendar decide, or hold one on. It changes for everyone at once. */
export function SeasonPicker({ mode: saved, showing }: SeasonPickerProps) {
  const router = useRouter();
  const [mode, setMode] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (key: SeasonMode) => {
    const before = mode;
    setMode(key);
    setBusy(true);
    setError(null);
    const result = await send('PUT', '/api/v1/staff/season', { season: key });
    setBusy(false);
    if (!result.ok) {
      setMode(before);
      return setError(result.message);
    }
    router.refresh();
  };

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div role="radiogroup" aria-label="Site Look" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button type="button" role="radio" aria-checked={mode === 'auto'} disabled={busy} onClick={() => pick('auto')} className={`${card(mode === 'auto')} sm:col-span-2 lg:col-span-3`}>
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
            <CalendarClock className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-sm font-semibold text-ink">
              Automatic
              {mode === 'auto' ? <span className="ml-2 text-xs font-medium text-accent-text">On Now</span> : null}
            </span>
            <span className="block text-xs text-ink-muted">
              Follows the calendar below. {mode === 'auto' ? `Today that means ${SEASONS[showing].label}.` : 'Each look comes on and goes off by itself.'}
            </span>
          </span>
        </button>
        {SEASON_KEYS.map((key) => {
          const chosen = mode === key;
          return (
            <button key={key} type="button" role="radio" aria-checked={chosen} disabled={busy} onClick={() => pick(key)} className={card(chosen)}>
              {/* A swatch of the look's bands. The standard look shows the logo's own two colors. */}
              <span aria-hidden="true" data-season={key} className="wr-season-swatch size-10 shrink-0 rounded-xl border border-line-strong" />
              <span className="min-w-0">
                <span className="block font-display text-sm font-semibold text-ink">
                  {SEASONS[key].label}
                  {chosen ? <span className="ml-2 text-xs font-medium text-accent-text">Held On</span> : null}
                </span>
                <span className="block text-xs text-ink-muted">{key === 'none' ? 'No look at all, whatever the date.' : SEASONS[key].note}</span>
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

      <div className="wr-glass rounded-2xl p-4">
        <h3 className="font-display text-sm font-semibold text-ink">The Calendar</h3>
        <p className="mt-1 text-xs text-ink-muted">Used while Automatic is on. Dates are the same every year, in UTC, and the seasons are the northern hemisphere’s. Any day not listed has the standard look.</p>
        <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {SEASON_CALENDAR.map((entry) => (
            <li key={`${entry.season}-${entry.from.join('-')}`} className="flex items-baseline justify-between gap-3">
              <span className="text-ink">
                <span className="font-medium">{SEASONS[entry.season].label}</span>
                <span className="text-ink-muted"> · {entry.why}</span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-ink-muted">{entry.from.join() === entry.to.join() ? day(entry.from) : `${day(entry.from)} – ${day(entry.to)}`}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
