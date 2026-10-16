'use client';

import type { RichDoc } from '@worldroot/editor';
import { RichTextEditor } from '@worldroot/editor/react';
import { buttonClass } from '@worldroot/ui';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { send } from '@/features/scenes/api';

const SAVE_DELAY_MS = 1200;

interface ChapterEditorProps {
  storyId: string;
  chapterId: string;
  title: string | null;
  doc: RichDoc;
  wordCount: number;
  number: number;
}

/**
 * Writing one chapter. Everything saves by itself a moment after the writer
 * stops typing, and again when they leave, so there is no Save button to forget.
 */
export function ChapterEditor({ storyId, chapterId, title: savedTitle, doc, wordCount: savedWords, number }: ChapterEditorProps) {
  const pending = useRef<{ title?: string; content?: RichDoc }>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<'saved' | 'waiting' | 'saving' | 'failed'>('saved');
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState(savedWords);

  const flush = async () => {
    if (timer.current) clearTimeout(timer.current);
    const body = pending.current;
    if (body.title === undefined && body.content === undefined) return;
    pending.current = {};
    setStatus('saving');
    const result = await send<{ wordCount: number }>('PATCH', `/api/v1/story-chapters/${chapterId}`, body);
    if (!result.ok) {
      // Kept to try again with the next change.
      pending.current = { ...body, ...pending.current };
      setStatus('failed');
      return setError(result.fields.content ?? result.fields.title ?? result.message);
    }
    setError(null);
    if (result.data) setWords(result.data.wordCount);
    setStatus(pending.current.title !== undefined || pending.current.content !== undefined ? 'waiting' : 'saved');
  };

  const schedule = (change: { title?: string; content?: RichDoc }) => {
    pending.current = { ...pending.current, ...change };
    setStatus('waiting');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  };

  // Save what is left when the page is closed or left.
  useEffect(() => {
    const leave = () => {
      const body = pending.current;
      if (body.title === undefined && body.content === undefined) return;
      void fetch(`/api/v1/story-chapters/${chapterId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: true });
    };
    window.addEventListener('pagehide', leave);
    return () => {
      window.removeEventListener('pagehide', leave);
      leave();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [chapterId]);

  const label = { saved: 'All Changes Saved', waiting: 'Writing…', saving: 'Saving…', failed: 'Not Saved' }[status];

  return (
    <div className="mx-auto flex max-w-[72ch] flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Chapter {number}</span>
        <input
          defaultValue={savedTitle ?? ''}
          onChange={(event) => schedule({ title: event.target.value })}
          placeholder={`Chapter ${number}`}
          maxLength={160}
          aria-label="Chapter Title"
          className="min-h-12 rounded-lg border border-transparent bg-transparent px-1 font-serif text-3xl font-semibold text-ink placeholder:text-ink-muted/60 hover:border-line focus-visible:border-line-strong focus-visible:outline-none"
        />
      </label>

      <RichTextEditor initial={doc} onChange={(next) => schedule({ content: next })} label="Chapter Text" placeholder="Once upon a time…" minHeight="60vh" />

      {error ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface/90 py-3 backdrop-blur">
        <p className="text-sm text-ink-muted" aria-live="polite">
          {label} · {words.toLocaleString('en')} {words === 1 ? 'Word' : 'Words'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/stories/${storyId}/${chapterId}`}
            onClick={() => void flush()}
            className={buttonClass('secondary')}
          >
            Read It
          </Link>
          <Link href={`/stories/${storyId}`} onClick={() => void flush()} className={buttonClass('primary')}>
            Done
          </Link>
        </div>
      </div>
    </div>
  );
}
