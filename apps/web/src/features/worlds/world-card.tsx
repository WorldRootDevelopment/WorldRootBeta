import type { World } from '@worldroot/core';
import { Globe } from 'lucide-react';
import Link from 'next/link';
import { cardClass } from '@/features/shell/prose';

export function WorldCard({ world, href, note }: { world: World; href?: string; note?: string }) {
  const body = (
    <>
      <Globe className="size-5 text-accent-text" aria-hidden="true" />
      <h3 className="mt-3 font-serif text-lg font-semibold text-ink">{world.name}</h3>
      {world.summary ? <p className="mt-1 text-sm leading-relaxed text-ink-muted">{world.summary}</p> : null}
      {note ? <p className="mt-3 text-xs text-ink-muted">{note}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className={cardClass}>
      {body}
    </Link>
  ) : (
    <div className={cardClass}>{body}</div>
  );
}
