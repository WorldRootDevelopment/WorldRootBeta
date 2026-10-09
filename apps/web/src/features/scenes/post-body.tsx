'use client';

import { isBlank, type RichDoc } from '@worldroot/editor';
import { RichTextEditor } from '@worldroot/editor/react';
import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { ReportButton } from '@/features/moderation/report-client';
import { send } from './api';
import { PostImages } from './post-images';

const linkButton =
  'rounded text-xs font-medium text-ink-muted hover:text-ink hover:underline disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** Asks before removing, then removes. Used on story posts and out-of-character messages. */
export function RemovePostButton({ postId, what = 'post' }: { postId: string; what?: 'post' | 'message' }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const remove = async () => {
    if (!window.confirm(`Remove this ${what}? A marker stays in its place. This cannot be undone.`)) return;
    setPending(true);
    const result = await send('DELETE', `/api/v1/posts/${postId}`);
    setPending(false);
    if (!result.ok) window.alert(result.message);
    else router.refresh();
  };

  return (
    <button type="button" onClick={remove} disabled={pending} className={linkButton}>
      {pending ? 'Removing…' : 'Remove'}
    </button>
  );
}

interface PostBodyProps {
  postId: string;
  /** Rendered on the server from a validated document, so it is safe to insert. */
  html: string;
  /** The editable document. Sent only to the post's author. */
  doc: RichDoc | null;
  canEdit: boolean;
  canRemove: boolean;
  /** Shown on other people’s posts. */
  canReport: boolean;
  /** The ids of the pictures under the post. They stay as they are when the words are edited. */
  images: string[];
}

/** A story post's text, with edit and remove controls for those allowed to use them. */
export function PostBody({ postId, html, doc, canEdit, canRemove, canReport, images }: PostBodyProps) {
  const router = useRouter();
  const draft = useRef<RichDoc | null>(doc);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if ((!draft.current || isBlank(draft.current)) && images.length === 0) return setError('A post cannot be empty. Remove it instead.');
    setPending(true);
    const result = await send('PATCH', `/api/v1/posts/${postId}`, { content: draft.current });
    setPending(false);
    if (!result.ok) return setError(result.fields.content ?? result.message);
    setError(null);
    setEditing(false);
    router.refresh();
  };

  if (editing && doc) {
    return (
      <div className="flex max-w-[68ch] flex-col gap-3">
        <RichTextEditor
          initial={doc}
          label="Edit Your Post"
          onChange={(next) => {
            draft.current = next;
          }}
        />
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex gap-3">
          <Button onClick={save} disabled={pending}>
            {pending ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => {
              draft.current = doc;
              setError(null);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="wr-prose max-w-[68ch]" dangerouslySetInnerHTML={{ __html: html }} />
      <PostImages images={images} />
      {canEdit || canRemove || canReport ? (
        <div className="mt-3 flex items-center gap-4">
          {canEdit && doc ? (
            <button type="button" onClick={() => setEditing(true)} className={linkButton}>
              Edit
            </button>
          ) : null}
          {canRemove ? <RemovePostButton postId={postId} /> : null}
          {canReport ? <ReportButton targetType="scene_post" targetId={postId} /> : null}
        </div>
      ) : null}
    </>
  );
}
