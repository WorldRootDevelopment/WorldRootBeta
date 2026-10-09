'use client';

import { DICE_THEME_KEYS, DICE_THEMES, toDiceTheme, type DiceThemeKey } from '@worldroot/contracts';
import { Button } from '@worldroot/ui';
import { Lock, Minus, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { send } from './api';
import { Die } from './die';

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const field =
  'min-h-11 w-full rounded-lg border border-line-strong bg-surface-raised px-3 text-base text-ink placeholder:text-ink-muted ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';
const smallLabel = 'text-xs font-semibold uppercase tracking-wide text-ink-muted';
const stepButton = `flex size-9 items-center justify-center rounded-full border border-line-strong text-ink hover:bg-surface-sunken disabled:opacity-40 ${focusRing}`;

const DICE = [4, 6, 8, 10, 12, 20, 100];
const SELF = 'self';
const MAX_COUNT = 20;
const MAX_MODIFIER = 99;
/** How long the dice tumble before they settle, in milliseconds. */
const TUMBLE_MS = 1100;
/** More dice than this are shown as one die carrying the total. */
const MAX_SHOWN = 6;

interface RollResult {
  notation: string;
  rolls: number[];
  total: number;
}

interface Throw {
  result: RollResult;
  sides: number;
  /** One entry per die shown. The numbers came from the server. */
  values: number[];
  landed: boolean;
}

const sidesOf = (notation: string) => Number(/d(\d+)/.exec(notation)?.[1] ?? 20);
const prefersStillness = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '');

/** A number with a button either side, for how many dice and what to add. */
function Stepper({ label, value, min, max, onChange, show }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void; show: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={smallLabel}>{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" className={stepButton} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Less: ${label}`}>
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <output className="min-w-10 text-center font-display text-lg font-bold tabular-nums text-ink" aria-live="polite">
          {show}
        </output>
        <button type="button" className={stepButton} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More: ${label}`}>
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

interface DiceRollerProps {
  sceneId: string;
  characters: Array<{ id: string; name: string }>;
  /** The dice theme saved on the roller's profile. */
  theme: string;
}

/** The dice tray: choose the dice, roll them, watch them land. Shown only where the community has DnD mode on. */
export function DiceRoller({ sceneId, characters, theme: savedTheme }: DiceRollerProps) {
  const router = useRouter();
  const [sides, setSides] = useState(20);
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [reason, setReason] = useState('');
  const [who, setWho] = useState(characters[0]?.id ?? SELF);
  const [theme, setTheme] = useState<DiceThemeKey>(toDiceTheme(savedTheme));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thrown, setThrown] = useState<Throw | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(settle.current), []);

  const notation = `${count}d${sides}${modifier > 0 ? `+${modifier}` : modifier < 0 ? modifier : ''}`;
  const choose = (next: { sides?: number; count?: number; modifier?: number }) => {
    // Changing the dice clears the last throw from the tray, so what is shown is always what will be rolled.
    setThrown(null);
    if (next.sides !== undefined) setSides(next.sides);
    if (next.count !== undefined) setCount(next.count);
    if (next.modifier !== undefined) setModifier(next.modifier);
  };

  /** Shows the dice tumbling, then settles them on the numbers the server rolled and brings the roll into the story. */
  const animate = (result: RollResult) => {
    clearTimeout(settle.current);
    const rolledSides = sidesOf(result.notation);
    const values = result.rolls.length > MAX_SHOWN ? [result.total] : result.rolls;
    const land = () => {
      setThrown({ result, sides: rolledSides, values, landed: true });
      router.refresh();
    };
    if (prefersStillness()) return land();
    setThrown({ result, sides: rolledSides, values, landed: false });
    settle.current = setTimeout(land, TUMBLE_MS);
  };

  const roll = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await send<{ roll: RollResult }>('POST', `/api/v1/scenes/${sceneId}/rolls`, { notation, reason, characterId: who === SELF ? null : who });
    setPending(false);
    if (!result.ok || !result.data) return setError(result.fields.notation ?? result.fields.reason ?? result.fields.characterId ?? result.message);
    setReason('');
    animate(result.data.roll);
  };

  const pickTheme = async (key: DiceThemeKey) => {
    const before = theme;
    setTheme(key);
    const result = await send('PUT', '/api/v1/profile/dice-theme', { theme: key });
    if (!result.ok) {
      setTheme(before);
      setError(result.message);
    }
  };

  const tumbling = Boolean(thrown && !thrown.landed);
  const showTotal = thrown?.landed && (thrown.values.length > 1 || thrown.result.total !== thrown.values[0]);
  const resting = Math.min(count, MAX_SHOWN);

  return (
    <form onSubmit={roll} aria-label="Roll dice" className={`wr-glass wr-dice-${theme} mt-8 overflow-hidden rounded-3xl`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <h3 className="font-display text-lg font-semibold text-ink">Dice</h3>
        <span className="rounded-full bg-accent-soft px-3 py-1 font-display text-sm font-bold tabular-nums text-accent-text" aria-label={`Rolling ${notation}`}>
          {count}d{sides}
          {signed(modifier)}
        </span>
      </div>

      {/* Which die. Each button is the die itself. */}
      <div role="radiogroup" aria-label="Which die" className="flex flex-wrap gap-1 px-4 pt-3">
        {DICE.map((die) => (
          <button
            key={die}
            type="button"
            role="radio"
            aria-checked={sides === die}
            onClick={() => choose({ sides: die })}
            className={`flex flex-col items-center gap-0.5 rounded-2xl px-2 pb-1.5 pt-1 text-xs font-semibold ${focusRing} ${sides === die ? 'bg-accent-soft text-accent-text' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'}`}
          >
            <Die sides={die} value={die === 100 ? '%' : die} small />
            d{die}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-4 px-5 pt-4">
        <Stepper label="How many" value={count} min={1} max={MAX_COUNT} onChange={(value) => choose({ count: value })} show={String(count)} />
        <Stepper label="Add or subtract" value={modifier} min={-MAX_MODIFIER} max={MAX_MODIFIER} onChange={(value) => choose({ modifier: value })} show={modifier === 0 ? '0' : signed(modifier)} />
      </div>

      <div className="grid gap-4 px-5 pt-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dice-reason" className={smallLabel}>
            What for (optional)
          </label>
          <input id="dice-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={120} placeholder="to pick the lock" className={field} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dice-who" className={smallLabel}>
            Rolling as
          </label>
          <select id="dice-who" value={who} onChange={(event) => setWho(event.target.value)} className={field}>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
            <option value={SELF}>Myself</option>
          </select>
        </div>
      </div>

      {error ? (
        <p role="alert" className="px-5 pt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {/* The tray: where the dice sit, tumble and land. */}
      <div className="wr-dice-tray mt-5 flex min-h-36 flex-wrap items-center justify-between gap-4 px-5 py-4">
        {/* The dice are decoration. The result is announced in words below, once, when they land. */}
        <div aria-hidden="true" className="flex min-h-24 flex-1 flex-wrap items-center">
          {thrown
            ? thrown.values.map((value, index) => (
                // The key changes when the dice land, so the settling turn starts afresh.
                <Die key={`${index}-${thrown.landed}`} sides={thrown.values.length === 1 && thrown.result.rolls.length > MAX_SHOWN ? 20 : thrown.sides} value={value} state={thrown.landed ? 'landed' : 'tumbling'} order={index} />
              ))
            : Array.from({ length: resting }, (_, index) => <Die key={index} sides={sides} value={sides === 100 ? '%' : sides} />)}
          {!thrown && count > MAX_SHOWN ? <span className="ml-2 font-display text-lg font-bold text-ink-muted">× {count}</span> : null}
          {showTotal ? <span className="ml-3 font-display text-3xl font-bold tabular-nums text-ink">= {thrown.result.total}</span> : null}
        </div>
        <p role="status" className="sr-only">
          {thrown?.landed ? `Rolled ${thrown.result.notation}: ${thrown.result.total}` : ''}
        </p>
        <Button type="submit" size="lg" disabled={pending || tumbling}>
          {pending || tumbling ? 'Rolling…' : `Roll ${count}d${sides}${signed(modifier)}`}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-5 py-3">
        <span className={smallLabel}>Dice style</span>
        <div role="radiogroup" aria-label="Dice style" className="flex flex-wrap items-center gap-1">
          {DICE_THEME_KEYS.map((key) => {
            const { label, note, free } = DICE_THEMES[key];
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={theme === key}
                aria-label={free ? `${label}. ${note}` : `${label}. ${note} Not available yet.`}
                title={free ? `${label} — ${note}` : `${label} — ${note} Coming later.`}
                disabled={!free}
                onClick={() => pickTheme(key)}
                className={`wr-dice-${key} relative rounded-xl p-0.5 ${focusRing} ${theme === key ? 'bg-accent-soft ring-2 ring-accent' : free ? 'hover:bg-surface-sunken' : 'opacity-70'}`}
              >
                <Die sides={20} value="" small />
                {free ? null : (
                  <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-surface-raised text-ink-muted ring-1 ring-line-strong">
                    <Lock className="size-2.5" aria-hidden="true" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="basis-full text-xs text-ink-muted sm:basis-auto">WorldRoot makes every roll and adds it to the story. A style only changes how your dice look.</p>
      </div>
    </form>
  );
}
