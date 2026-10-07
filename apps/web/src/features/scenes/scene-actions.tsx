'use client';

import { SCENE_STATUS_LABELS, SCENE_STATUSES, type SceneStatus } from '@worldroot/contracts';
import { docFromText } from '@worldroot/editor';
import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { send } from './api';

const inputClass =
  'min-h-11 w-full rounded-lg border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';

const ErrorLine = ({ message }: { message: string | null }) =>
  message ? (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  ) : null;

/** The out-of-character input. Kept short and plain on purpose. */
export function OocForm({ sceneId }: { sceneId: string }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    setPending(true);
    const result = await send('POST', `/api/v1/scenes/${sceneId}/posts`, { kind: 'ooc', content: docFromText(text) });
    setPending(false);
    if (!result.ok) return setError(result.fields.content ?? result.message);
    setText('');
    setError(null);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
      <label className="sr-only" htmlFor={`ooc-${sceneId}`}>
        Out-of-character message
      </label>
      <textarea
        id={`ooc-${sceneId}`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Say something out of character…"
        className={`${inputClass} resize-y py-2`}
      />
      <ErrorLine message={error} />
      <Button type="submit" variant="secondary" disabled={pending || !text.trim()} className="self-end">
        {pending ? 'Sending…' : 'Send'}
      </Button>
    </form>
  );
}

/** Bring one or more of your characters into the scene. */
export function JoinForm({ sceneId, characters, joined }: { sceneId: string; characters: Array<{ id: string; name: string }>; joined: boolean }) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string[]>(characters.length === 1 ? [characters[0]!.id] : []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    const result = await send('POST', `/api/v1/scenes/${sceneId}/characters`, { characterIds: chosen });
    setPending(false);
    if (!result.ok) return setError(result.fields.characterIds ?? result.message);
    setChosen([]);
    setError(null);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium text-ink">{joined ? 'Bring another character' : 'Join with a character'}</legend>
        {characters.map((character) => (
          <label key={character.id} className="flex min-h-11 items-center gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={chosen.includes(character.id)}
              onChange={(event) =>
                setChosen((current) => (event.target.checked ? [...current, character.id] : current.filter((id) => id !== character.id)))
              }
              className="size-5 accent-accent"
            />
            <span className="font-serif text-base">{character.name}</span>
          </label>
        ))}
      </fieldset>
      <ErrorLine message={error} />
      <Button type="submit" variant={joined ? 'secondary' : 'primary'} disabled={pending || chosen.length === 0} className="self-start">
        {pending ? 'Joining…' : joined ? 'Bring into scene' : 'Join scene'}
      </Button>
    </form>
  );
}

/** Invite someone to a private scene by their handle. */
export function InviteForm({ sceneId }: { sceneId: string }) {
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setInvited(null);
    const result = await send('POST', `/api/v1/scenes/${sceneId}/participants`, { handle });
    setPending(false);
    if (!result.ok) return setError(result.fields.handle ?? result.message);
    setInvited(handle.replace(/^@/, ''));
    setHandle('');
    setError(null);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor={`invite-${sceneId}`} className="text-sm font-medium text-ink">
        Invite a writer
      </label>
      <div className="flex gap-2">
        <input
          id={`invite-${sceneId}`}
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          placeholder="@handle"
          autoCapitalize="none"
          spellCheck={false}
          className={inputClass}
        />
        <Button type="submit" variant="secondary" disabled={pending || !handle.trim()}>
          Invite
        </Button>
      </div>
      <ErrorLine message={error} />
      {invited ? (
        <p role="status" className="text-sm text-ink-muted">
          @{invited} can now read this scene and bring a character.
        </p>
      ) : null}
    </form>
  );
}

/** Move the scene through its lifecycle. Shown to whoever may manage it. */
export function StatusControl({ sceneId, status }: { sceneId: string; status: SceneStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (next: SceneStatus) => {
    setPending(true);
    const result = await send('POST', `/api/v1/scenes/${sceneId}/status`, { status: next });
    setPending(false);
    if (!result.ok) return setError(result.message);
    setError(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`status-${sceneId}`} className="text-sm font-medium text-ink">
        Scene status
      </label>
      <select
        id={`status-${sceneId}`}
        value={status}
        disabled={pending}
        onChange={(event) => change(event.target.value as SceneStatus)}
        className={inputClass}
      >
        {SCENE_STATUSES.map((option) => (
          <option key={option} value={option}>
            {SCENE_STATUS_LABELS[option]}
          </option>
        ))}
      </select>
      <ErrorLine message={error} />
    </div>
  );
}

const REFRESH_MS = 15_000;

/**
 * Keeps an open scene current: records how far the reader has read, and
 * re-fetches the page on a timer while the tab is visible. A stand-in for the
 * live event stream, which replaces the timer later.
 */
export function SceneLive({ sceneId, lastSeq, track }: { sceneId: string; lastSeq: number; track: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (track) void send('POST', `/api/v1/scenes/${sceneId}/read`, { seq: lastSeq });
  }, [sceneId, lastSeq, track]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  return null;
}
