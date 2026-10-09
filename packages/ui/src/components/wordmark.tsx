import { useId } from 'react';
import { cn } from '../cn';

const LEFT_PAGE = 'M5 14.5c9.9-1.2 18.7 1.2 27 7.2v25.8C24.2 41.7 15.2 39.1 5 40.4V14.5Z';
const RIGHT_PAGE = 'M59 14.5c-9.9-1.2-18.7 1.2-27 7.2v25.8c7.8-5.800 16.800-8.400 27-7.100V14.500Z';
const BANDS = [1, 2, 3, 4, 5, 6];

/**
 * The WorldRoot mark: an open book whose spine grows down into roots.
 * The pages keep their own colors in both themes. The spine and roots take
 * the text color, so they stay visible on a dark page.
 *
 * While staff have a site look switched on, the pages are drawn in that
 * look's six bands instead. Both versions are in the drawing and the
 * stylesheet shows one of them, so the mark needs no knowledge of which
 * look is on.
 */
export function RootMark({ className }: { className?: string }) {
  // Each mark has its own gradient. A page can hold several marks, some of them hidden, and a
  // gradient that lives inside a hidden mark paints nothing for the marks that borrow it.
  const bands = `wr-logo-bands-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn('size-8', className)} fill="none">
      <defs>
        {/* Six equal bands from top to bottom, with hard edges, in the colors of the site look. */}
        <linearGradient id={bands} x1="0" y1="0" x2="0" y2="1">
          {BANDS.flatMap((band) => [
            <stop key={`${band}a`} offset={(band - 1) / 6} style={{ stopColor: `var(--season-${band})` }} />,
            <stop key={`${band}b`} offset={band / 6} style={{ stopColor: `var(--season-${band})` }} />,
          ])}
        </linearGradient>
      </defs>
      <g className="wr-logo-plain">
        <path fill="#D77B57" d={LEFT_PAGE} />
        <path fill="#E9A37E" d={RIGHT_PAGE} />
      </g>
      <g className="wr-logo-season">
        <path fill={`url(#${bands})`} d={LEFT_PAGE} />
        <path fill={`url(#${bands})`} d={RIGHT_PAGE} />
      </g>
      <path
        d="M32 22v25.500M32 47.500c-1 4-3.700 7.100-8 9.500M32 47.500c1 4 3.700 7.100 8 9.500M32 49.500V59M27.800 52.700l-6.300-.2M36.200 52.700l6.300-.2"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.500 20.500c6.200-.1 11.600 1.500 16.500 4.800M53.500 20.500c-6.200-.1-11.600 1.500-16.500 4.800" stroke="#FFF7EC" strokeWidth="2.250" strokeLinecap="round" opacity=".9" />
    </svg>
  );
}

export function Wordmark({ className, markOnly = false }: { className?: string; markOnly?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-ink', className)}>
      <RootMark />
      <span className={cn('wr-title wr-wordmark-name pr-1 font-brand text-2xl leading-none', markOnly && 'sr-only')}>WorldRoot</span>
    </span>
  );
}
