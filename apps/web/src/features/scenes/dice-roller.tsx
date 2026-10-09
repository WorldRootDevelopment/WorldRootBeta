'use client';

import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { send } from './api';

const field =
  'min-h-11 rounded-lg border border-line-strong bg-surface-raised px-3 text-base text-ink placeholder:text-ink-muted ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';
const quick =
  'min-h-9 rounded-full border border-line-strong px-3 text-sm font-medium text-ink-muted hover:text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

const COMMON = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
const SELF = 'self';
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
  /** How many sides the dice have, read from the tidied notation, so every face shows a number the die could roll. */
  sides: number;
  /** One entry per die shown: the number that came up. The real numbers came from the server. */
  values: number[];
  landed: boolean;
}

const sidesOf = (notation: string) => Number(/d(\d+)/.exec(notation)?.[1] ?? 20);
const prefersStillness = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The six faces of one die. The first is the face that ends up towards you and
 * carries the result. The other five carry other numbers the die could show,
 * chosen from the result so they are the same on every render.
 */
function faces(value: number, sides: number): number[] {
  const others = Array.from({ length: 5 }, (_, index) => ((value - 1 + (index + 1) * Math.max(1, Math.floor(sides / 6) || 1)) % sides) + 1);
  return [value, ...others];
}

/** One die: a cube in 3D that spins while the roll is in the air and settles with the result facing you. */
function Die({ value, sides, landed, order }: { value: number; sides: number; landed: boolean; order: number }) {
  const delay = { animationDelay: `${order * 70}ms` };
  return (
    <span className={`wr-die-stage ${landed ? 'wr-die-landed' : 'wr-die-tumbling'}`}>
      <span className="wr-die-hop block" style={delay}>
        <span className="wr-die-cube block" style={delay}>
          {faces(value, sides).map((face, index) => (
            <span key={index} className="wr-die-face">
              {face}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

/** Rolls dice into the scene. Shown only where the community has DnD mode on. */
export function DiceRoller({ sceneId, characters }: { sceneId: string; characters: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [notation, setNotation] = useState('d20');
  const [reason, setReason] = useState('');
  const [who, setWho] = useState(characters[0]?.id ?? SELF);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thrown, setThrown] = useState<Throw | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(settle.current), []);

  /** Shows the dice tumbling, then settles them on the numbers the server rolled and brings the roll into the story. */
  const animate = (result: RollResult) => {
    clearTimeout(settle.current);
    const sides = sidesOf(result.notation);
    // Many dice are shown as one die carrying the total, which may be larger than any one face.
    const many = result.rolls.length > MAX_SHOWN;
    const values = many ? [result.total] : result.rolls;
    const land = () => {
      setThrown({ result, sides: many ? Math.max(sides, result.total) : sides, values, landed: true });
      router.refresh();
    };
    if (prefersStillness()) return land();
    setThrown({ result, sides: many ? Math.max(sides, result.total) : sides, values, landed: false });
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

  const tumbling = Boolean(thrown && !thrown.landed);
  const showTotal = thrown?.landed && (thrown.values.length > 1 || thrown.result.total !== thrown.values[0]);

  return (
    <form onSubmit={roll} aria-label="Roll dice" className="wr-glass mt-8 flex flex-col gap-3 rounded-2xl p-4">
      <p className="text-sm font-medium text-ink">Roll dice</p>
      <div className="flex flex-wrap gap-2">
        {COMMON.map((die) => (
          <button key={die} type="button" className={quick} onClick={() => setNotation(die)}>
            {die}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
        <div className="flex flex-col gap-1">
          <label htmlFor="dice-notation" className="text-xs font-medium text-ink-muted">
            Dice
          </label>
          <input id="dice-notation" value={notation} onChange={(event) => setNotation(event.target.value)} maxLength={12} className={field} autoComplete="off" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dice-reason" className="text-xs font-medium text-ink-muted">
            What for (optional)
          </label>
          <input id="dice-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={120} placeholder="to pick the lock" className={field} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dice-who" className="text-xs font-medium text-ink-muted">
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
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : (
        <p className="text-xs text-ink-muted">Like d20, 2d6 or 3d8+2. WorldRoot makes the roll and adds it to the story; it cannot be edited.</p>
      )}

      <div className="flex min-h-24 flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending || tumbling || !notation.trim()}>
          {pending || tumbling ? 'Rolling…' : 'Roll'}
        </Button>
        {thrown ? (
          <>
            {/* The dice are decoration. The result is announced in words below, once, when they land. */}
            <div aria-hidden="true" className="flex flex-wrap items-center">
              {thrown.values.map((value, index) => (
                // The key changes when the dice land, so the settling turn starts afresh.
                <Die key={`${index}-${thrown.landed}`} value={value} sides={thrown.sides} landed={thrown.landed} order={index} />
              ))}
              {showTotal ? <span className="ml-2 font-display text-xl font-bold text-ink">= {thrown.result.total}</span> : null}
            </div>
            <p role="status" className="sr-only">
              {thrown.landed ? `Rolled ${thrown.result.notation}: ${thrown.result.total}` : ''}
            </p>
          </>
        ) : null}
      </div>
    </form>
  );
}
