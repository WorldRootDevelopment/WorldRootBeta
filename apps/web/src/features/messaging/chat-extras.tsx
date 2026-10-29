'use client';

import { REACTIONS, type Reaction } from '@worldroot/contracts';
import { CornerUpLeft, SmilePlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { send } from '@/features/scenes/api';

export interface ReplyTarget {
  id: string;
  authorName: string;
  excerpt: string;
}

const ReplyContext = createContext<{ target: ReplyTarget | null; setTarget: (target: ReplyTarget | null) => void }>({ target: null, setTarget: () => {} });

/** Holds which message the composer is replying to, shared by the messages and the box below them. */
export function ReplyProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ReplyTarget | null>(null);
  return <ReplyContext.Provider value={{ target, setTarget }}>{children}</ReplyContext.Provider>;
}

export const useReply = () => useContext(ReplyContext);

const actionButton =
  'flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-raised hover:text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** Starts a reply to one message. */
export function ReplyButton({ target }: { target: ReplyTarget }) {
  const { setTarget } = useReply();
  return (
    <button
      type="button"
      className={actionButton}
      onClick={() => {
        setTarget(target);
        document.querySelector<HTMLTextAreaElement>('textarea[data-chat-box]')?.focus();
      }}
    >
      <CornerUpLeft className="size-4" aria-hidden="true" />
      <span className="sr-only">Reply To {target.authorName}</span>
    </button>
  );
}

/** Above the message box while replying: who to, and a way to stop. */
export function ReplyBanner() {
  const { target, setTarget } = useReply();
  if (!target) return null;
  return (
    <div className="mb-2 flex items-center gap-2 rounded-lg bg-surface-sunken px-3 py-1.5 text-sm">
      <CornerUpLeft className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-ink-muted">
        Replying To <span className="font-medium text-ink">{target.authorName}</span>: {target.excerpt}
      </span>
      <button type="button" onClick={() => setTarget(null)} className={actionButton}>
        <X className="size-4" aria-hidden="true" />
        <span className="sr-only">Stop Replying</span>
      </button>
    </div>
  );
}

interface ReactionsProps {
  messageId: string;
  reactions: Array<{ emoji: Reaction; count: number; mine: boolean }>;
  /** False for people who can read but not post: they see reactions but cannot add them. */
  canReact: boolean;
}

/** A message's reactions, each a button that adds or takes away yours, and a picker for a new one. */
export function Reactions({ messageId, reactions, canReact }: ReactionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggle = async (emoji: Reaction) => {
    setBusy(true);
    setOpen(false);
    const result = await send('POST', `/api/v1/messages/${messageId}/reactions`, { emoji });
    setBusy(false);
    if (result.ok) router.refresh();
  };

  if (reactions.length === 0 && !canReact) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          aria-pressed={reaction.mine}
          disabled={!canReact || busy}
          onClick={() => toggle(reaction.emoji)}
          className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${reaction.mine ? 'border-accent bg-accent-soft text-accent-text' : 'border-line bg-surface-raised text-ink hover:border-line-strong'}`}
        >
          <span aria-hidden="true">{reaction.emoji}</span>
          {reaction.count}
          <span className="sr-only">{reaction.mine ? ', including yours. Press to take yours away.' : '. Press to add yours.'}</span>
        </button>
      ))}
      {canReact ? (
        <span className="relative">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className={`${actionButton} ${reactions.length === 0 ? 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100' : ''}`}
          >
            <SmilePlus className="size-4" aria-hidden="true" />
            <span className="sr-only">Add A Reaction</span>
          </button>
          {open ? (
            <span role="group" aria-label="Reactions" className="wr-popover absolute bottom-full left-0 z-10 mb-1 flex gap-0.5 rounded-xl p-1">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  disabled={busy}
                  onClick={() => toggle(emoji)}
                  className="flex size-9 items-center justify-center rounded-lg text-lg hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {emoji}
                </button>
              ))}
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
