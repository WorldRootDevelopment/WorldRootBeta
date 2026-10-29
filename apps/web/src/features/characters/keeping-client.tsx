'use client';

import { Button, TextArea } from '@worldroot/ui';
import { Link2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';

/** Shares a library character with everyone signed in, or makes it private again, and copies its link. */
export function SharingControl({ characterId, shared: saved }: { characterId: string; shared: boolean }) {
  const router = useRouter();
  const [shared, setShared] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (next: boolean) => {
    setBusy(true);
    setError(null);
    const result = await send('PUT', `/api/v1/characters/${characterId}/sharing`, { shared: next });
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setShared(next);
    router.refresh();
  };

  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/characters/${characterId}`).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-ink">Sharing</p>
      <label className="flex min-h-11 items-start gap-3 text-sm text-ink">
        <input type="checkbox" checked={shared} disabled={busy} onChange={(event) => change(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-accent" />
        <span>
          Share this character
          <span className="block text-ink-muted">
            Anyone signed in to WorldRoot can open its page, and it is listed on your profile. Your tags and private notes are never shown.
          </span>
        </span>
      </label>
      {shared ? (
        <span className="inline-flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={copy}>
            <Link2 className="size-4" aria-hidden="true" />
            Copy Link
          </Button>
          <span aria-live="polite" className="text-sm text-ink-muted">
            {copied ? 'Copied.' : ''}
          </span>
        </span>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Notes about a character for its player alone: plans, reminders, things to keep straight. */
export function NotesEditor({ characterId, notes }: { characterId: string; notes: string | null }) {
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setSaved(false);
    const result = await send('PUT', `/api/v1/characters/${characterId}/notes`, { notes: new FormData(event.currentTarget).get('notes') });
    setPending(false);
    if (!result.ok) return setError(result.fields.notes ?? result.message);
    setError(null);
    setSaved(true);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <TextArea
        label="Private Notes"
        name="notes"
        defaultValue={notes ?? ''}
        rows={5}
        maxLength={10000}
        error={error ?? undefined}
        hint="Only you ever see these: plans for the character, things to remember, ideas for later."
      />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? 'Saving…' : 'Save Notes'}
        </Button>
        <span aria-live="polite" className="text-sm text-ink-muted">
          {saved ? 'Saved.' : ''}
        </span>
      </div>
    </form>
  );
}

interface RelationshipsEditorProps {
  characterId: string;
  relationships: Array<{ id: string; other: { id: string; name: string }; label: string }>;
  /** The writer's other library characters, to choose from. */
  candidates: Array<{ id: string; name: string }>;
}

/** How this character is related to the writer's other characters. Each one shows on both pages. */
export function RelationshipsEditor({ characterId, relationships, candidates }: RelationshipsEditorProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setBusy(true);
    const result = await send('POST', `/api/v1/characters/${characterId}/relationships`, { otherId: form.get('otherId'), label: form.get('label') });
    setBusy(false);
    if (!result.ok) return setError(result.fields.label ?? result.fields.other ?? result.message);
    setError(null);
    element.reset();
    router.refresh();
  };

  const remove = async (id: string) => {
    setBusy(true);
    const result = await send('DELETE', `/api/v1/relationships/${id}`);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-ink">Relationships</p>
      <p className="-mt-2 text-sm text-ink-muted">How this character is connected to your others. Each shows on both characters&rsquo; pages.</p>
      {relationships.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {relationships.map((relationship) => (
            <li key={relationship.id} className="flex flex-wrap items-center gap-2 text-sm text-ink">
              <Link href={`/characters/${relationship.other.id}`} className="font-medium text-accent-text hover:underline">
                {relationship.other.name}
              </Link>
              <span className="text-ink-muted">· {relationship.label}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(relationship.id)}
                className="flex size-9 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Remove The Relationship With {relationship.other.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {candidates.length > 0 ? (
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm text-ink">
            With
            <select
              name="otherId"
              required
              className="min-h-11 rounded-lg border border-line-strong bg-surface-raised px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
            >
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink">
            They Are
            <input
              name="label"
              required
              maxLength={40}
              placeholder="Siblings, Rivals, Old Flames…"
              className="min-h-11 w-56 rounded-lg border border-line-strong bg-surface-raised px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
            />
          </label>
          <Button type="submit" variant="secondary" disabled={busy}>
            Add
          </Button>
        </form>
      ) : (
        <p className="text-sm text-ink-muted">Make another character in your library to connect them.</p>
      )}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
