'use client';

import { Button } from '@worldroot/ui';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ReportButton } from '@/features/moderation/report-client';
import { send } from '@/features/scenes/api';

/** Kudos for a story: a count everyone sees, and a button readers press to give theirs. */
export function KudosButton({ storyId, count: saved, mine: savedMine, canGive }: { storyId: string; count: number; mine: boolean; canGive: boolean }) {
  const [kudos, setKudos] = useState({ count: saved, mine: savedMine });
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    const result = await send<{ kudos: { count: number; mine: boolean } }>('POST', `/api/v1/stories/${storyId}/kudos`);
    setBusy(false);
    if (result.ok && result.data) setKudos(result.data.kudos);
  };
  const label = `${kudos.count.toLocaleString('en')} Kudos`;
  if (!canGive) {
    return (
      <span className="inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-muted">
        <Heart className="size-4" aria-hidden="true" />
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={kudos.mine}
      onClick={toggle}
      disabled={busy}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${kudos.mine ? 'border-accent bg-accent-soft text-accent-text' : 'border-line-strong bg-surface-raised text-ink hover:bg-surface-sunken'}`}
    >
      <Heart className={`size-4 ${kudos.mine ? 'fill-current' : ''}`} aria-hidden="true" />
      {kudos.mine ? 'Kudos Given' : 'Leave Kudos'}
      <span className="text-ink-muted">· {kudos.count.toLocaleString('en')}</span>
    </button>
  );
}

interface CommentsProps {
  storyId: string;
  chapterId: string;
  comments: Array<{ id: string; body: string; authorName: string | null; authorHandle: string | null; createdAt: string; mine: boolean; canRemove: boolean }>;
  /** Comments are open and the viewer may add one. */
  canComment: boolean;
  closedNote: string | null;
}

/** A chapter's comments, and the box to add one. */
export function Comments({ storyId, chapterId, comments, canComment, closedNote }: CommentsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    setPending(true);
    const result = await send('POST', `/api/v1/stories/${storyId}/chapters/${chapterId}/comments`, { body: new FormData(element).get('body') });
    setPending(false);
    if (!result.ok) return setError(result.fields.body ?? result.message);
    setError(null);
    element.reset();
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remove this comment?')) return;
    const result = await send('DELETE', `/api/v1/story-comments/${id}`);
    if (!result.ok) return window.alert(result.message);
    router.refresh();
  };

  return (
    <section id="comments" aria-labelledby="comments-heading" className="mt-12 scroll-mt-24">
      <h2 id="comments-heading" className="mb-4 font-display text-xl font-semibold text-ink">
        Comments {comments.length > 0 ? <span className="text-ink-muted">· {comments.length}</span> : null}
      </h2>
      {comments.length > 0 ? (
        <ol className="mb-6 flex flex-col gap-4">
          {comments.map((comment) => (
            <li key={comment.id} className="wr-glass rounded-2xl p-4">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                {comment.authorHandle ? (
                  <Link href={`/u/${comment.authorHandle}`} className="font-medium text-ink hover:underline">
                    {comment.authorName ?? comment.authorHandle}
                  </Link>
                ) : (
                  <span className="font-medium text-ink">A Former Member</span>
                )}
                <time dateTime={comment.createdAt} className="text-xs text-ink-muted">
                  {new Date(comment.createdAt).toLocaleDateString('en', { dateStyle: 'medium' })}
                </time>
                <span className="ml-auto inline-flex items-center gap-3">
                  {comment.canRemove ? (
                    <button type="button" onClick={() => remove(comment.id)} className="text-xs font-medium text-ink-muted hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                      Remove
                    </button>
                  ) : null}
                  {comment.mine ? null : <ReportButton targetType="story_comment" targetId={comment.id} />}
                </span>
              </p>
              <p className="mt-2 whitespace-pre-line break-words text-ink">{comment.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mb-6 text-sm text-ink-muted">No comments yet.</p>
      )}
      {canComment ? (
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <label htmlFor="comment-body" className="text-sm font-medium text-ink">
            Leave A Comment
          </label>
          <textarea
            id="comment-body"
            name="body"
            rows={4}
            maxLength={2000}
            required
            className="w-full rounded-lg border border-line-strong bg-surface-raised px-3 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
          />
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? 'Posting…' : 'Post Comment'}
            </Button>
          </div>
        </form>
      ) : closedNote ? (
        <p className="text-sm text-ink-muted">{closedNote}</p>
      ) : null}
    </section>
  );
}
