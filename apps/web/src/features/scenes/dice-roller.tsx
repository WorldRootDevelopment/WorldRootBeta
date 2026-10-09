'use client';

import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from './api';

const field =
  'min-h-11 rounded-lg border border-line-strong bg-surface-raised px-3 text-base text-ink placeholder:text-ink-muted ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';
const quick =
  'min-h-9 rounded-full border border-line-strong px-3 text-sm font-medium text-ink-muted hover:text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

const COMMON = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
const SELF = 'self';

/** Rolls dice into the scene. Shown only where the community has DnD mode on. */
export function DiceRoller({ sceneId, characters }: { sceneId: string; characters: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [notation, setNotation] = useState('d20');
  const [reason, setReason] = useState('');
  const [who, setWho] = useState(characters[0]?.id ?? SELF);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roll = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await send('POST', `/api/v1/scenes/${sceneId}/rolls`, { notation, reason, characterId: who === SELF ? null : who });
    setPending(false);
    if (!result.ok) return setError(result.fields.notation ?? result.fields.reason ?? result.fields.characterId ?? result.message);
    setReason('');
    router.refresh();
  };

  return (
    <form onSubmit={roll} aria-label="Roll dice" className="mt-8 flex flex-col gap-3 rounded-2xl border border-line p-4">
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
      <div>
        <Button type="submit" variant="secondary" disabled={pending || !notation.trim()}>
          {pending ? 'Rolling…' : 'Roll'}
        </Button>
      </div>
    </form>
  );
}
