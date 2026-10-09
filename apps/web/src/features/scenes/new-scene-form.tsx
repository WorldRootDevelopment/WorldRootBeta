'use client';

import { CONTENT_RATING_HINTS, CONTENT_RATING_LABELS, CONTENT_RATINGS, ratingsUpTo, type ContentRating } from '@worldroot/contracts';
import type { RichDoc } from '@worldroot/editor';
import { RichTextEditor } from '@worldroot/editor/react';
import { TextArea, TextField } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { FormFooter } from '@/features/shell/form-footer';
import { send } from './api';

interface NewSceneFormProps {
  /** The community location the scene is set in. Null for a private scene. */
  locationId: string | null;
  characters: Array<{ id: string; name: string; tagline: string | null }>;
  cancelHref: string;
  /** The highest rating the community allows. A private scene allows them all. */
  maxRating: string;
  communityName: string | null;
}

/** Start a scene: a title, who you are bringing, a rating and the opening post. */
export function NewSceneForm({ locationId, characters, cancelHref, maxRating, communityName }: NewSceneFormProps) {
  const ratings = ratingsUpTo(maxRating);
  const router = useRouter();
  const opening = useRef<RichDoc | null>(null);
  const [chosen, setChosen] = useState<string[]>(characters.length === 1 ? [characters[0]!.id] : []);
  const [rating, setRating] = useState<ContentRating>('everyone');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setFields({});
    const result = await send<{ scene: { id: string } }>('POST', '/api/v1/scenes', {
      title: form.get('title'),
      description: form.get('description'),
      rating,
      locationId,
      characterIds: chosen,
      openingPost: opening.current ?? { type: 'doc', content: [] },
    });
    if (!result.ok || !result.data) {
      setFields(result.fields);
      setError(Object.keys(result.fields).length > 0 ? 'Check the highlighted fields.' : result.message);
      setPending(false);
      return;
    }
    router.push(`/scenes/${result.data.scene.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-8" noValidate>
      <div className="flex flex-col gap-5">
        <TextField label="Title" name="title" error={fields.title} maxLength={160} required autoFocus />
        <TextArea
          label="Premise"
          name="description"
          error={fields.description}
          rows={3}
          maxLength={2000}
          hint="Optional. What the scene is about and who it is open to."
        />
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium text-ink">Your Characters In This Scene</legend>
        {characters.map((character) => (
          <label key={character.id} className="flex min-h-11 items-start gap-3 py-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={chosen.includes(character.id)}
              onChange={(event) =>
                setChosen((current) => (event.target.checked ? [...current, character.id] : current.filter((id) => id !== character.id)))
              }
              className="mt-0.5 size-5 shrink-0 accent-accent"
            />
            <span>
              <span className="font-display text-base font-semibold">{character.name}</span>
              {character.tagline ? <span className="block text-ink-muted">{character.tagline}</span> : null}
            </span>
          </label>
        ))}
        <p className="text-sm text-ink-muted">The first one you tick writes the opening post. You can bring more later.</p>
        {fields.characterIds ? (
          <p role="alert" className="text-sm text-danger">
            {fields.characterIds}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium text-ink">Content Rating</legend>
        {ratings.map((option) => (
          <label key={option} className="flex min-h-11 items-start gap-3 py-2 text-sm text-ink">
            <input
              type="radio"
              name="rating"
              checked={rating === option}
              onChange={() => setRating(option)}
              className="mt-0.5 size-5 shrink-0 accent-accent"
            />
            <span>
              <span className="font-medium">{CONTENT_RATING_LABELS[option]}</span>
              <span className="block text-ink-muted">{CONTENT_RATING_HINTS[option]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {ratings.length < CONTENT_RATINGS.length && communityName ? (
        <p className="-mt-2 text-sm text-ink-muted">
          {communityName} allows scenes rated up to {CONTENT_RATING_LABELS[ratings.at(-1)!]}.
        </p>
      ) : null}
      {fields.rating ? (
        <p role="alert" className="text-sm text-danger">
          {fields.rating}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-ink">Opening Post</p>
        <RichTextEditor
          label="Opening Post"
          placeholder="Set The Scene…"
          minHeight="14rem"
          onChange={(doc) => {
            opening.current = doc;
          }}
        />
        {fields.content ? (
          <p role="alert" className="text-sm text-danger">
            {fields.content}
          </p>
        ) : null}
      </div>

      <FormFooter error={error} pending={pending} submitLabel="Start Scene" cancelHref={cancelHref} />
    </form>
  );
}
