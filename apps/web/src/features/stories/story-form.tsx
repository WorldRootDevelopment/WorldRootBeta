'use client';

import { CONTENT_RATING_HINTS, CONTENT_RATING_LABELS, CONTENT_RATINGS, STORY_VISIBILITIES, STORY_VISIBILITY_LABELS, type ContentRating, type StoryVisibility } from '@worldroot/contracts';
import { Button, TextArea, TextField } from '@worldroot/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';
import { FormFooter } from '@/features/shell/form-footer';

interface StoryFormProps {
  /** The writer's library characters and worlds, to tag. */
  characters: Array<{ id: string; name: string }>;
  worlds: Array<{ id: string; name: string }>;
  /** The story being changed. Absent when starting one. */
  story?: { id: string; title: string; summary: string | null; rating: ContentRating; visibility: StoryVisibility; worldId: string | null; characterIds: string[]; commentsOpen: boolean };
}

const radioRow = 'flex min-h-11 items-start gap-3 py-2 text-sm text-ink';

/** Start a story, or change its title, summary, rating, who can read it and who is in it. */
export function StoryForm({ characters, worlds, story }: StoryFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState<ContentRating>(story?.rating ?? 'everyone');
  const [visibility, setVisibility] = useState<StoryVisibility>(story?.visibility ?? 'private');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      title: form.get('title'),
      summary: form.get('summary'),
      rating,
      visibility,
      worldId: form.get('worldId') || null,
      characterIds: form.getAll('characterIds'),
      commentsOpen: form.get('commentsOpen') === 'on',
    };
    setPending(true);
    const result = story
      ? await send('PATCH', `/api/v1/stories/${story.id}`, body)
      : await send<{ story: { id: string }; chapter: { id: string } }>('POST', '/api/v1/stories', body);
    setPending(false);
    setFields(result.fields);
    setError(result.ok ? null : Object.keys(result.fields).length > 0 ? 'Check the highlighted fields.' : result.message);
    if (!result.ok) return;
    if (story) {
      router.push(`/stories/${story.id}`);
    } else {
      const created = result.data as { story: { id: string }; chapter: { id: string } };
      // Straight to the first page, ready to write.
      router.push(`/stories/${created.story.id}/${created.chapter.id}/write`);
    }
    router.refresh();
  };

  const remove = async () => {
    if (!story || !window.confirm(`Delete “${story.title}” and every chapter of it? This cannot be undone.`)) return;
    setPending(true);
    const result = await send('DELETE', `/api/v1/stories/${story.id}`);
    setPending(false);
    if (!result.ok) return setError(result.message);
    router.push('/stories');
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-5" noValidate>
      <TextField label="Title" name="title" defaultValue={story?.title ?? ''} error={fields.title} maxLength={160} required />
      <TextArea
        label="Summary"
        name="summary"
        defaultValue={story?.summary ?? ''}
        error={fields.summary}
        rows={3}
        maxLength={2000}
        hint="Optional. A line or two about what happens, shown on the story's front page."
      />

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium text-ink">Characters In It</legend>
        {characters.length > 0 ? (
          <div className="flex flex-wrap gap-x-5">
            {characters.map((character) => (
              <label key={character.id} className="flex min-h-11 items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="characterIds" value={character.id} defaultChecked={story?.characterIds.includes(character.id) ?? false} className="size-5 shrink-0 accent-accent" />
                {character.name}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            Optional. You have no characters yet.{' '}
            <Link href="/library/characters/new" className="font-medium text-accent-text underline">
              Create One
            </Link>
          </p>
        )}
        {fields.characterIds ? (
          <p role="alert" className="text-sm text-danger">
            {fields.characterIds}
          </p>
        ) : null}
      </fieldset>

      {worlds.length > 0 ? (
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          <span className="font-medium">Set In</span>
          <select
            name="worldId"
            defaultValue={story?.worldId ?? ''}
            className="min-h-11 w-fit rounded-lg border border-line-strong bg-surface-raised px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
          >
            <option value="">No Particular World</option>
            {worlds.map((world) => (
              <option key={world.id} value={world.id}>
                {world.name}
              </option>
            ))}
          </select>
          {fields.worldId ? <span className="text-danger">{fields.worldId}</span> : null}
        </label>
      ) : null}

      <fieldset className="flex flex-col">
        <legend className="mb-1 text-sm font-medium text-ink">Content Rating</legend>
        {CONTENT_RATINGS.map((option) => (
          <label key={option} className={radioRow}>
            <input type="radio" name="rating" checked={rating === option} onChange={() => setRating(option)} className="mt-0.5 size-5 shrink-0 accent-accent" />
            <span>
              <span className="font-medium">{CONTENT_RATING_LABELS[option]}</span>
              <span className="block text-ink-muted">{CONTENT_RATING_HINTS[option]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col">
        <legend className="mb-1 text-sm font-medium text-ink">Who Can Read It</legend>
        {STORY_VISIBILITIES.map((option) => (
          <label key={option} className={radioRow}>
            <input type="radio" name="visibility" checked={visibility === option} onChange={() => setVisibility(option)} className="mt-0.5 size-5 shrink-0 accent-accent" />
            <span>
              <span className="font-medium">{STORY_VISIBILITY_LABELS[option].label}</span>
              <span className="block text-ink-muted">{STORY_VISIBILITY_LABELS[option].hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="flex min-h-11 items-start gap-3 text-sm text-ink">
        <input type="checkbox" name="commentsOpen" defaultChecked={story?.commentsOpen ?? true} className="mt-0.5 size-5 shrink-0 accent-accent" />
        <span>
          Let readers comment
          <span className="block text-ink-muted">Readers can leave kudos either way. You can remove any comment on your story.</span>
        </span>
      </label>

      <FormFooter error={error} pending={pending} submitLabel={story ? 'Save Story' : 'Start Writing'} cancelHref={story ? `/stories/${story.id}` : '/stories'} />

      {story ? (
        <div className="mt-6 border-t border-line pt-6">
          <Button variant="ghost" onClick={remove} disabled={pending}>
            Delete This Story
          </Button>
        </div>
      ) : null}
    </form>
  );
}
