'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, type KeyboardEvent } from 'react';
import { send } from '@/features/scenes/api';

const MAX_TAGS = 10;

interface TagEditorProps {
  characterId: string;
  tags: string[];
  /** Tags already used on the writer's other characters, offered as suggestions. */
  known: string[];
}

/** Labels for sorting a library character. Each change is saved at once. */
export function TagEditor({ characterId, tags: saved, known }: TagEditorProps) {
  const router = useRouter();
  const inputId = useId();
  const listId = useId();
  const [tags, setTags] = useState(saved);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = async (next: string[]) => {
    const before = tags;
    setTags(next);
    setError(null);
    const result = await send<{ tags: string[] }>('PUT', `/api/v1/characters/${characterId}/tags`, { tags: next });
    if (!result.ok) {
      setTags(before);
      return setError(result.message);
    }
    if (result.data) setTags(result.data.tags);
    router.refresh();
  };

  const add = () => {
    const tag = draft.trim();
    setDraft('');
    if (!tag || tags.some((other) => other.toLowerCase() === tag.toLowerCase())) return;
    void save([...tags, tag]);
  };

  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        Tags
      </label>
      <p className="-mt-1 text-sm text-ink-muted">Your own labels for finding characters in your Library, such as Main Cast or Fantasy. Only you see them.</p>
      {tags.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-accent-soft pl-3 pr-1 text-sm font-medium text-accent-text">
              {tag}
              <button
                type="button"
                onClick={() => save(tags.filter((other) => other !== tag))}
                className="flex size-7 items-center justify-center rounded-full hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
              >
                <X className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Remove The Tag {tag}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {tags.length < MAX_TAGS ? (
        <div className="flex flex-wrap gap-2">
          <input
            id={inputId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={keyDown}
            list={listId}
            maxLength={24}
            placeholder="Add A Tag"
            className="min-h-11 w-56 rounded-lg border border-line-strong bg-surface-raised px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
          />
          <datalist id={listId}>
            {known
              .filter((tag) => !tags.some((other) => other.toLowerCase() === tag.toLowerCase()))
              .map((tag) => (
                <option key={tag} value={tag} />
              ))}
          </datalist>
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            className="min-h-11 rounded-lg border border-line-strong px-3 text-sm font-medium text-ink hover:bg-surface-sunken disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Add
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
