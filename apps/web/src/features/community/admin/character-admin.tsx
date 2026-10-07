'use client';

import { CHARACTER_FIELD_TYPE_LABELS, CHARACTER_FIELD_TYPES } from '@worldroot/contracts';
import type { CharacterField, PendingCharacter } from '@worldroot/core';
import { Button, TextArea, TextField } from '@worldroot/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';

type FieldType = (typeof CHARACTER_FIELD_TYPES)[number];

const selectClass =
  'min-h-11 rounded-lg border border-line-strong bg-surface-raised px-3 text-base text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';

/** The community's character template: the fields every character here is asked for. */
export function FieldsEditor({ communityId, fields }: { communityId: string; fields: CharacterField[] }) {
  const router = useRouter();
  const [type, setType] = useState<FieldType>('short_text');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    const result = await send('POST', `/api/v1/communities/${communityId}/character-fields`, {
      label: form.get('label'),
      type,
      required: form.get('required') === 'on',
      options: String(form.get('options') ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    });
    setPending(false);
    setErrors(result.fields);
    setError(result.ok || Object.keys(result.fields).length > 0 ? null : result.message);
    if (!result.ok) return;
    formElement.reset();
    setType('short_text');
    router.refresh();
  };

  const remove = async (field: CharacterField) => {
    if (!window.confirm(`Remove the ${field.label} field? What characters already entered is kept but no longer shown.`)) return;
    const result = await send('DELETE', `/api/v1/character-fields/${field.id}`);
    setError(result.ok ? null : result.message);
    if (result.ok) router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      {fields.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {fields.map((field) => (
            <li key={field.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3">
              <p className="min-w-0 text-sm">
                <span className="font-medium text-ink">{field.label}</span>
                <span className="text-ink-muted">
                  {' '}
                  · {CHARACTER_FIELD_TYPE_LABELS[field.type as FieldType] ?? field.type} · {field.required ? 'Required' : 'Optional'}
                </span>
                {field.options?.length ? <span className="block text-ink-muted">{field.options.join(', ')}</span> : null}
              </p>
              <Button variant="ghost" onClick={() => remove(field)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">No extra fields. Characters here use only the standard profile.</p>
      )}

      <form onSubmit={add} className="flex max-w-2xl flex-col gap-4 rounded-2xl border border-dashed border-line-strong p-5" noValidate>
        <h3 className="font-serif text-lg font-semibold text-ink">Add a field</h3>
        <TextField label="Field name" name="label" error={errors.label} maxLength={60} placeholder="Rank" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="field-type" className="text-sm font-medium text-ink">
            Kind of answer
          </label>
          <select id="field-type" value={type} onChange={(event) => setType(event.target.value as FieldType)} className={selectClass}>
            {CHARACTER_FIELD_TYPES.map((option) => (
              <option key={option} value={option}>
                {CHARACTER_FIELD_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
        {type === 'single_choice' ? <TextArea label="Choices" name="options" error={errors.options} rows={4} hint="One per line." /> : null}
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
          <input type="checkbox" name="required" className="size-5 accent-accent" />
          Required for every character
        </label>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? 'Adding…' : 'Add field'}
        </Button>
      </form>
    </div>
  );
}

/** Characters waiting for a reviewer, and those already sent back. */
export function ReviewQueue({ characters }: { characters: PendingCharacter[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (id: string, decision: 'approved' | 'returned') => {
    setBusy(id);
    const result = await send('POST', `/api/v1/characters/${id}/review`, { decision });
    setBusy(null);
    setError(result.ok ? null : result.message);
    if (result.ok) router.refresh();
  };

  if (characters.length === 0) return <p className="text-ink-muted">No characters are waiting for review.</p>;

  return (
    <>
      {error ? (
        <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {characters.map((character) => (
          <li key={character.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface-raised p-5">
            <div className="min-w-0">
              <Link
                href={`/characters/${character.id}`}
                className="rounded font-serif text-lg font-semibold text-ink hover:text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {character.name}
              </Link>
              <p className="text-sm text-ink-muted">
                {character.playerHandle ? `Played by @${character.playerHandle}` : 'No player'}
                {character.status === 'returned' ? ' · Returned to its player' : ' · Waiting for review'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button disabled={busy !== null} onClick={() => decide(character.id, 'approved')}>
                Approve
              </Button>
              {character.status === 'pending' ? (
                <Button variant="secondary" disabled={busy !== null} onClick={() => decide(character.id, 'returned')}>
                  Return
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
