'use client';

import { DICE_THEME_KEYS, DICE_THEMES, diceItemKey, toDiceTheme, type DiceThemeKey } from '@worldroot/contracts';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { send } from '@/features/scenes/api';
import { Die } from '@/features/scenes/die';

const SAMPLE = [4, 6, 8, 10, 12, 20];

/** Choose how your dice look. The choice is saved at once and used wherever you roll. */
export function DiceStylePicker({ theme: saved, owned }: { theme: string; /** Keys of the store items this person has. */ owned: string[] }) {
  const router = useRouter();
  const [theme, setTheme] = useState<DiceThemeKey>(toDiceTheme(saved));
  const [error, setError] = useState<string | null>(null);

  const pick = async (key: DiceThemeKey) => {
    const before = theme;
    setTheme(key);
    setError(null);
    const result = await send('PUT', '/api/v1/profile/dice-theme', { theme: key });
    if (!result.ok) {
      setTheme(before);
      return setError(result.message);
    }
    router.refresh();
  };

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      {/* The whole set in the chosen style. Decoration: the choice is named in the list below. */}
      <div aria-hidden="true" className={`wr-dice-${theme} wr-dice-tray flex flex-wrap items-center justify-center rounded-2xl px-4 py-3`}>
        {SAMPLE.map((sides) => (
          <Die key={sides} sides={sides} value={sides} />
        ))}
      </div>

      <div role="radiogroup" aria-label="Dice Style" className="grid gap-3 sm:grid-cols-2">
        {DICE_THEME_KEYS.map((key) => {
          const { label, note } = DICE_THEMES[key];
          // Free to everyone, or theirs from the store.
          const free = DICE_THEMES[key].free || owned.includes(diceItemKey(key));
          const chosen = theme === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={chosen}
              disabled={!free}
              onClick={() => pick(key)}
              className={`wr-glass wr-dice-${key} flex items-center gap-3 rounded-2xl p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${chosen ? 'ring-2 ring-accent' : ''} ${free ? 'hover:border-line-strong' : 'opacity-70'}`}
            >
              <Die sides={20} value="" small />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-sm font-semibold text-ink">
                  {label}
                  {chosen ? <span className="ml-2 text-xs font-medium text-accent-text">In Use</span> : null}
                </span>
                <span className="block text-xs text-ink-muted">{note}</span>
              </span>
              {free ? null : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-sunken px-2 py-1 text-xs font-medium text-ink-muted">
                  <Lock className="size-3" aria-hidden="true" />
                  In The Store
                </span>
              )}
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <p className="text-sm text-ink-muted">
        Locked styles are in the{' '}
        <Link href="/store" className="font-medium text-accent-text underline">
          Store
        </Link>
        , which is coming soon.
      </p>
    </div>
  );
}
