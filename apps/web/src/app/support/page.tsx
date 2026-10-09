import { buttonClass, Wordmark } from '@worldroot/ui';
import { Heart } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLinks } from '@/features/legal/legal-page';

export const metadata: Metadata = { title: 'Support WorldRoot' };

// The donation address comes from the server's settings, which are not known when the site is built.
export const dynamic = 'force-dynamic';

/**
 * Where donations go: a page on a donation service, named in the server's
 * settings. WorldRoot takes no payment itself and never sees card details.
 * Only an https address is used, so a mistyped setting cannot become a link
 * to something else.
 */
function donateUrl(): string | null {
  const value = process.env.WORLDROOT_DONATE_URL?.trim();
  if (!value) return null;
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

/** Why WorldRoot asks for donations and where to give one. Open to everyone, signed in or not. */
export default function SupportPage() {
  const url = donateUrl();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 md:px-8">
      <header className="flex h-16 items-center justify-between">
        <Link href="/" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
          <Wordmark />
        </Link>
        <Link href="/" className={buttonClass('ghost')}>
          Back
        </Link>
      </header>

      <main className="flex-1 py-10">
        <h1 className="wr-title w-fit pb-1 font-display text-4xl font-bold tracking-tight md:text-5xl">Support WorldRoot</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          WorldRoot is independent and has no advertising. It is paid for out of pocket: the servers, the database and the storage for
          everyone&rsquo;s pictures. If it has given you somewhere good to write, a donation helps keep it running.
        </p>

        <div className="wr-glass mt-8 rounded-2xl p-6">
          {url ? (
            <>
              <a href={url} target="_blank" rel="noreferrer" className={buttonClass('primary', 'lg')}>
                <Heart className="size-5" aria-hidden="true" />
                Donate
              </a>
              <p className="mt-3 text-sm text-ink-muted">
                Opens our donation page on another site, which takes the payment. WorldRoot never sees your card details.
              </p>
            </>
          ) : (
            <p role="status" className="text-ink">
              Donations are not open yet. Thank you for wanting to help; check back soon.
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/store" className={buttonClass('secondary')}>
            Visit The Store
          </Link>
        </div>

        <h2 className="mb-2 mt-10 font-display text-xl font-semibold text-ink">What A Donation Is</h2>
        <ul className="ml-5 list-disc space-y-1.5 leading-relaxed text-ink-muted">
          <li>A gift toward running costs. It is not a purchase, and it does not buy anything on WorldRoot.</li>
          <li>Everything you can do on WorldRoot today, you can do without paying.</li>
          <li>Donating never changes how the rules apply to you.</li>
        </ul>

        <h2 className="mb-2 mt-10 font-display text-xl font-semibold text-ink">Other Ways To Help</h2>
        <p className="leading-relaxed text-ink-muted">
          Bring a friend to write with, report what is broken, and tell us what you wish WorldRoot did. In time there will also be a{' '}
          <Link href="/store" className="font-medium text-accent-text underline underline-offset-2 hover:no-underline">
            Store
          </Link>{' '}
          for things like dice styles.
        </p>
      </main>

      <LegalLinks className="pb-8" />
    </div>
  );
}
