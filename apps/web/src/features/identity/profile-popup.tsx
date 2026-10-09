'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';

/**
 * The pop-up a profile opens in when a name is clicked. It sits over the page
 * the person was on; closing it returns them there. Escape, the close button
 * and a click outside all close it.
 */
export function ProfilePopup({ handle, children }: { handle: string; children: ReactNode }) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    // Remember what had focus, move focus into the pop-up, and put it back on closing.
    const before = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    // The page behind should not scroll while the pop-up is open.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [close]);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div aria-hidden="true" onClick={close} className="fixed inset-0 bg-black/45 backdrop-blur-sm" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-popup-name"
        tabIndex={-1}
        className="wr-popover relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl outline-none"
      >
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
          {/* A plain link, so it loads the full page instead of opening this pop-up again. */}
          <a
            href={`/u/${handle}`}
            className="inline-flex min-h-9 items-center rounded-full bg-surface-raised/90 px-3 text-xs font-medium text-ink shadow-raised hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Open full profile
          </a>
          <button
            type="button"
            onClick={close}
            className="flex size-9 items-center justify-center rounded-full bg-surface-raised/90 text-ink shadow-raised hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
