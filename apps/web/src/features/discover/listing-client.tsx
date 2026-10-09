'use client';

import {
  CONTENT_RATING_LABELS,
  CONTENT_RATINGS,
  LFRP_DAYS,
  LFRP_GENRE_KEYS,
  LFRP_GENRES,
  LFRP_KINDS,
  LFRP_PACES,
  type LfrpGenre,
  type LfrpKind,
  type LfrpPace,
} from '@worldroot/contracts';
import { Button, TextArea, TextField } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';
import { FormFooter } from '@/features/shell/form-footer';

const select =
  'min-h-11 rounded-lg border border-line-strong bg-surface-raised px-3 text-base text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';

const choice =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-surface-raised px-3 text-sm text-ink ' +
  'has-checked:border-accent has-checked:bg-accent-soft has-checked:text-accent-text has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-focus';

/** The form for a new "Looking for RP" listing. */
export function ListingForm() {
  const router = useRouter();
  const [genres, setGenres] = useState<LfrpGenre[]>([]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const toggle = (genre: LfrpGenre) => setGenres((held) => (held.includes(genre) ? held.filter((key) => key !== genre) : [...held, genre]));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const result = await send('POST', '/api/v1/lfrp', {
      title: form.get('title'),
      body: form.get('body'),
      genres,
      kind: form.get('kind'),
      pace: form.get('pace'),
      rating: form.get('rating'),
    });
    if (!result.ok) {
      setPending(false);
      setFields(result.fields);
      return setError(result.message);
    }
    router.push('/discover/partners');
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-6" noValidate>
      <TextField name="title" label="Title" maxLength={100} required error={fields.title} hint="What you would like to write, in a line." />
      <TextArea
        name="body"
        label="What are you looking for?"
        rows={7}
        maxLength={2000}
        required
        error={fields.body}
        hint="The idea, the kind of partner, anything you will not write. Plain text."
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-ink">Genres</legend>
        <div className="flex flex-wrap gap-2">
          {LFRP_GENRE_KEYS.map((genre) => (
            <label key={genre} className={choice}>
              <input type="checkbox" className="sr-only" checked={genres.includes(genre)} onChange={() => toggle(genre)} />
              {LFRP_GENRES[genre]}
            </label>
          ))}
        </div>
        {fields.genres ? (
          <p role="alert" className="text-sm text-danger">
            {fields.genres}
          </p>
        ) : (
          <p className="text-sm text-ink-muted">Up to three.</p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-ink">Writing With</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(LFRP_KINDS) as LfrpKind[]).map((kind, index) => (
            <label key={kind} className={choice}>
              <input type="radio" name="kind" value={kind} className="sr-only" defaultChecked={index === 0} />
              {LFRP_KINDS[kind]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="listing-pace" className="text-sm font-medium text-ink">
            Pace
          </label>
          <select id="listing-pace" name="pace" defaultValue="daily" className={select}>
            {(Object.keys(LFRP_PACES) as LfrpPace[]).map((pace) => (
              <option key={pace} value={pace}>
                {LFRP_PACES[pace]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="listing-rating" className="text-sm font-medium text-ink">
            Content Rating
          </label>
          <select id="listing-rating" name="rating" defaultValue="teen" className={select}>
            {CONTENT_RATINGS.map((rating) => (
              <option key={rating} value={rating}>
                {CONTENT_RATING_LABELS[rating]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-ink-muted">Your listing stays up for {LFRP_DAYS} days, or until you take it down.</p>
      <FormFooter error={error} pending={pending} submitLabel="Post Listing" cancelHref="/discover/partners" />
    </form>
  );
}

/** Opens a direct conversation with a listing's author. The usual message-request rules apply. */
export function MessageAuthorButton({ handle }: { handle: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    setPending(true);
    setError(null);
    const result = await send<{ conversation: { id: string } }>('POST', '/api/v1/conversations', { handles: handle });
    if (!result.ok || !result.data) {
      setPending(false);
      return setError(result.message ?? 'Could not start a conversation. Try again.');
    }
    router.push(`/inbox/${result.data.conversation.id}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" className="normal-case" onClick={open} disabled={pending}>
        {pending ? 'Opening…' : `Message @${handle}`}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RemoveListingButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (!window.confirm('Take this listing down?')) return;
    setPending(true);
    const result = await send('DELETE', `/api/v1/lfrp/${listingId}`);
    setPending(false);
    if (!result.ok) return setError(result.message);
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="ghost" onClick={remove} disabled={pending}>
        {pending ? 'Removing…' : 'Take Down'}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
