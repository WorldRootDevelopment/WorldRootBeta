'use client';

import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCloseOnNavigate } from '@/features/shell/use-close-on-navigate';
import { CHANGELOG } from './entries';

const SEEN_KEY = 'wr-changelog-seen';
const latestId = CHANGELOG[0]?.id ?? '';

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' });

const readSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
};

/**
 * The "What's new" menu at the top right. It shows a dot when the newest
 * changelog entry is one this browser has not opened the menu for.
 */
export function ChangelogMenu() {
  const ref = useCloseOnNavigate();
  // Unknown until the browser's storage is read, so the server and first paint agree on "no dot".
  const [seenId, setSeenId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setSeenId(readSeen());
  }, []);

  const [open, setOpen] = useState(false);

  // The dot goes as soon as the menu opens. The "New" labels stay until it closes.
  const unread = !open && seenId !== undefined && seenId !== latestId;
  // Entries above the last one seen are new to this person.
  const seenIndex = CHANGELOG.findIndex((entry) => entry.id === seenId);
  const newCount = seenId === undefined ? 0 : seenIndex === -1 ? CHANGELOG.length : seenIndex;

  const markSeen = (nowOpen: boolean) => {
    setOpen(nowOpen);
    if (!nowOpen) {
      // Closing clears the "New" labels; they have been read.
      setSeenId(latestId);
      return;
    }
    try {
      localStorage.setItem(SEEN_KEY, latestId);
    } catch {
      // Without storage the dot simply returns next visit.
    }
  };

  return (
    <details ref={ref} className="relative" onToggle={(event) => markSeen(event.currentTarget.open)}>
      <summary
        className="relative flex size-11 cursor-pointer list-none items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden"
        aria-label={unread ? `What’s new, ${newCount} unread` : 'What’s new'}
        title="What’s New"
      >
        <Sparkles className="size-5" aria-hidden="true" />
        {unread ? <span aria-hidden="true" className="absolute right-2 top-2 size-2.5 rounded-full bg-accent ring-2 ring-surface-raised" /> : null}
      </summary>

      <section
        aria-label="What’s New"
        className="absolute right-0 top-full z-20 mt-2 flex max-h-[min(32rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col wr-popover rounded-xl"
      >
        <h2 className="border-b border-line px-5 py-3 font-display text-lg font-semibold text-ink">What’s New</h2>
        <ol className="overflow-y-auto px-5">
          {CHANGELOG.map((entry, index) => (
            <li key={entry.id} className="border-b border-line py-4 last:border-b-0">
              <p className="flex items-center gap-2 text-xs text-ink-muted">
                <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                {index < newCount ? (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent-text">New</span>
                ) : null}
              </p>
              <h3 className="mt-1 font-medium text-ink">{entry.title}</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-muted">
                {entry.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </details>
  );
}
