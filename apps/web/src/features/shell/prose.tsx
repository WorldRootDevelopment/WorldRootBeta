import { cn } from '@worldroot/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

/** Long-form text in the story typeface. Blank lines separate paragraphs; single line breaks are kept. */
export function Prose({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('max-w-[68ch] space-y-4 font-serif text-[1.0625rem] leading-relaxed text-ink', className)}>
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

const linkClass =
  'rounded hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link href={item.href} className={linkClass}>
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 mt-12 font-serif text-xl font-semibold text-ink first:mt-0">{children}</h2>;
}

export const cardClass =
  'block rounded-2xl border border-line bg-surface-raised p-5 transition-colors hover:border-line-strong ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
