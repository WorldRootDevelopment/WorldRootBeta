'use client';

import { Button } from '@worldroot/ui';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { send } from '@/features/scenes/api';

/** Adds a chapter at the end of the story and opens it for writing. */
export function AddChapterButton({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const add = async () => {
    setPending(true);
    const result = await send<{ chapter: { id: string } }>('POST', `/api/v1/stories/${storyId}/chapters`);
    setPending(false);
    if (!result.ok || !result.data) return setError(result.message);
    router.push(`/stories/${storyId}/${result.data.chapter.id}/write`);
  };
  return (
    <span className="inline-flex flex-col gap-1">
      <Button onClick={add} disabled={pending}>
        {pending ? 'Adding…' : 'Add A Chapter'}
      </Button>
      {error ? (
        <span role="alert" className="text-sm text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}

/** For the writer, beside each chapter in the contents: move it, or delete it. */
export function ChapterControls({ chapterId, title, first, last }: { chapterId: string; title: string; first: boolean; last: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const act = async (method: 'PATCH' | 'DELETE', body?: unknown) => {
    setBusy(true);
    const result = await send(method, `/api/v1/story-chapters/${chapterId}`, body);
    setBusy(false);
    if (!result.ok) return window.alert(result.message);
    router.refresh();
  };
  const icon = 'flex size-10 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
  return (
    <span className="flex shrink-0 items-center gap-1">
      <button type="button" className={icon} disabled={busy || first} onClick={() => act('PATCH', { move: 'up' })}>
        <ArrowUp className="size-4" aria-hidden="true" />
        <span className="sr-only">Move {title} Up</span>
      </button>
      <button type="button" className={icon} disabled={busy || last} onClick={() => act('PATCH', { move: 'down' })}>
        <ArrowDown className="size-4" aria-hidden="true" />
        <span className="sr-only">Move {title} Down</span>
      </button>
      <button
        type="button"
        disabled={busy || (first && last)}
        onClick={() => {
          if (window.confirm(`Delete ${title}? This cannot be undone.`)) void act('DELETE');
        }}
        className="rounded px-2 text-xs font-medium text-ink-muted hover:text-ink hover:underline disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        Delete
      </button>
    </span>
  );
}
