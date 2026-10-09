import { cn } from '../cn';

/**
 * The WorldRoot mark: an open book whose spine grows down into roots.
 * The pages keep their own colours in both themes. The spine and roots take
 * the text colour, so they stay visible on a dark page.
 */
export function RootMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn('size-8', className)} fill="none">
      <path fill="#D77B57" d="M5 14.5c9.9-1.2 18.7 1.2 27 7.2v25.8C24.2 41.7 15.2 39.1 5 40.4V14.5Z" />
      <path fill="#E9A37E" d="M59 14.5c-9.9-1.2-18.7 1.2-27 7.2v25.8c7.8-5.8 16.8-8.4 27-7.1V14.5Z" />
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
      <span className={cn('wr-title pr-1 font-brand text-2xl leading-none', markOnly && 'sr-only')}>WorldRoot</span>
    </span>
  );
}
