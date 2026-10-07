'use client';

import type { CharacterField } from '@worldroot/core';
import { TextArea, TextField } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';
import { FormFooter } from '@/features/shell/form-footer';

interface AddToCommunityFormProps {
  communityId: string;
  communitySlug: string;
  communityName: string;
  characters: Array<{ id: string; name: string; tagline: string | null }>;
  fields: CharacterField[];
}

const selectClass =
  'min-h-11 rounded-lg border border-line-strong bg-surface-raised px-3 text-base text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';

/** Pick a library character and fill in the fields this community asks for. */
export function AddToCommunityForm({ communityId, communitySlug, communityName, characters, fields }: AddToCommunityFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setErrors({});
    const result = await send<{ character: { id: string } }>('POST', `/api/v1/communities/${communityId}/characters`, {
      characterId: form.get('characterId'),
      customValues: Object.fromEntries(fields.map((field) => [field.id, String(form.get(`field-${field.id}`) ?? '')])),
    });
    if (!result.ok || !result.data) {
      setErrors(result.fields);
      setError(Object.keys(result.fields).length > 0 ? 'Fill in the fields this community requires.' : result.message);
      setPending(false);
      return;
    }
    router.push(`/characters/${result.data.character.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="characterId" className="text-sm font-medium text-ink">
          Character
        </label>
        <select id="characterId" name="characterId" className={`${selectClass} font-serif font-semibold`} required>
          {characters.map((character) => (
            <option key={character.id} value={character.id}>
              {character.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-ink-muted">
          {communityName} receives its own copy and keeps it. Your original stays in your library, and later changes to either do not reach the
          other.
        </p>
      </div>

      {fields.map((field) => {
        const name = `field-${field.id}`;
        const label = field.required ? field.label : `${field.label} (optional)`;
        if (field.type === 'single_choice' && field.options) {
          return (
            <div key={field.id} className="flex flex-col gap-1.5">
              <label htmlFor={name} className="text-sm font-medium text-ink">
                {label}
              </label>
              <select id={name} name={name} defaultValue="" className={selectClass} aria-invalid={errors[field.id] ? true : undefined}>
                <option value="">Choose…</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors[field.id] ? (
                <p role="alert" className="text-sm text-danger">
                  {errors[field.id]}
                </p>
              ) : null}
            </div>
          );
        }
        return field.type === 'long_text' ? (
          <TextArea key={field.id} label={label} name={name} error={errors[field.id]} rows={4} />
        ) : (
          <TextField key={field.id} label={label} name={name} error={errors[field.id]} inputMode={field.type === 'number' ? 'numeric' : undefined} />
        );
      })}

      <FormFooter error={error} pending={pending} submitLabel={`Add to ${communityName}`} cancelHref={`/c/${communitySlug}/characters`} />
    </form>
  );
}
