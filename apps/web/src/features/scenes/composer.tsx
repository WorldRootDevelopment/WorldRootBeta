'use client';

import { isBlank, type RichDoc } from '@worldroot/editor';
import { RichTextEditor, type Editor } from '@worldroot/editor/react';
import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { send } from './api';

const NARRATOR = 'narrator';
const SAVE_DELAY_MS = 1500;

interface ComposerProps {
  sceneId: string;
  /** The writer's characters in this scene. */
  characters: Array<{ id: string; name: string }>;
  /** The draft saved on the server, if any. */
  draft: { characterId: string | null; content: RichDoc } | null;
}

interface LocalDraft {
  who: string;
  doc: RichDoc;
}

/**
 * The scene composer. The writer picks who is speaking, writes, and posts
 * deliberately: Return always makes a new line. The draft is kept in the
 * browser on every change and on the server after a short pause, so a closed
 * tab or a dropped connection loses nothing.
 */
export function Composer({ sceneId, characters, draft }: ComposerProps) {
  const router = useRouter();
  const storageKey = `wr-draft-${sceneId}`;
  const editorRef = useRef<Editor | null>(null);
  const docRef = useRef<RichDoc | null>(draft?.content ?? null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [who, setWho] = useState(draft?.characterId ?? characters[0]?.id ?? NARRATOR);
  const [empty, setEmpty] = useState(!draft || isBlank(draft.content));
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const whoRef = useRef(who);
  whoRef.current = who;

  const characterId = (value: string) => (value === NARRATOR ? null : value);

  const scheduleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaved('saving');
    saveTimer.current = setTimeout(async () => {
      if (!docRef.current) return;
      const result = await send('PUT', `/api/v1/scenes/${sceneId}/draft`, {
        characterId: characterId(whoRef.current),
        content: docRef.current,
      });
      setSaved(result.ok ? 'saved' : 'idle');
    }, SAVE_DELAY_MS);
  };

  const remember = (doc: RichDoc, speaker: string) => {
    try {
      if (isBlank(doc)) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify({ who: speaker, doc } satisfies LocalDraft));
    } catch {
      // Storage can be unavailable in private windows. The server copy still saves.
    }
  };

  const onChange = (doc: RichDoc) => {
    docRef.current = doc;
    setEmpty(isBlank(doc));
    setError(null);
    remember(doc, whoRef.current);
    scheduleSave();
  };

  // With no server draft, pick up one this browser kept, such as after going offline mid-post.
  const onReady = (editor: Editor) => {
    editorRef.current = editor;
    if (draft) return;
    try {
      const kept = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as LocalDraft | null;
      if (!kept?.doc) return;
      editor.commands.setContent(kept.doc);
      docRef.current = kept.doc;
      setEmpty(isBlank(kept.doc));
      if (kept.who === NARRATOR || characters.some((character) => character.id === kept.who)) setWho(kept.who);
    } catch {
      // A draft that cannot be read is ignored.
    }
  };

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const post = async () => {
    if (!docRef.current || empty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setPending(true);
    setError(null);
    const result = await send('POST', `/api/v1/scenes/${sceneId}/posts`, {
      kind: 'ic',
      characterId: characterId(who),
      content: docRef.current,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.fields.content ?? result.fields.characterId ?? result.message);
      return;
    }
    editorRef.current?.commands.clearContent();
    docRef.current = null;
    setEmpty(true);
    setSaved('idle');
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Nothing to clear.
    }
    router.refresh();
  };

  return (
    <section aria-label="Write A Post" className="flex flex-col gap-3">
      <label className="flex flex-wrap items-center gap-3 text-sm font-medium text-ink">
        Writing As
        <select
          value={who}
          onChange={(event) => {
            setWho(event.target.value);
            if (docRef.current) {
              remember(docRef.current, event.target.value);
              scheduleSave();
            }
          }}
          className="min-h-11 rounded-lg border border-line-strong bg-surface-raised px-3 font-display text-base font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
        >
          {characters.map((character) => (
            <option key={character.id} value={character.id}>
              {character.name}
            </option>
          ))}
          <option value={NARRATOR}>Narrator</option>
        </select>
      </label>

      <RichTextEditor initial={draft?.content} onChange={onChange} onReady={onReady} label="Your Post" placeholder="Continue the story…" />

      {error ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted" aria-live="polite">
          {saved === 'saving' ? 'Saving draft…' : saved === 'saved' ? 'Draft saved' : 'Your draft saves as you write.'}
        </p>
        <Button onClick={post} disabled={pending || empty} size="lg">
          {pending ? 'Posting…' : 'Post'}
        </Button>
      </div>
    </section>
  );
}
