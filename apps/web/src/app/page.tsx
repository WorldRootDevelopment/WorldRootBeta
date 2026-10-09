import { buttonClass, Wordmark } from '@worldroot/ui';
import Link from 'next/link';
import { LegalLinks } from '@/features/legal/legal-page';
import { demoGuestEnabled } from '@/lib/server';
import { getViewer } from '@/lib/session';

const PILLARS = [
  { title: 'Create Characters', body: 'Rich profiles that live in your own library and travel with you.' },
  { title: 'Build Worlds', body: 'Settings, locations and lore in one place, for any genre.' },
  { title: 'Find Each Other', body: 'Communities and partners, discovered by what they write.' },
  { title: 'Write Together', body: 'Scenes made for long-form prose, kept as living history.' },
];

/**
 * The landing page. Shown to everyone, signed in or not, so it always has one
 * address to share. Someone already signed in is offered their Home instead of
 * the sign-in buttons.
 */
export default async function LandingPage() {
  const viewer = await getViewer();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 md:px-8">
      <header className="flex h-16 items-center justify-between">
        <Wordmark />
        <div className="flex items-center gap-1">
          <Link href="/install" className={buttonClass('ghost')}>
            Get The App
          </Link>
          <Link href={viewer ? '/home' : '/sign-in'} className={buttonClass('ghost')}>
            {viewer ? 'Go to Home' : 'Sign in'}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center py-16">
        <h1 className="wr-title max-w-3xl pb-2 font-display text-5xl font-bold leading-tight tracking-tight md:text-6xl">
          Where stories take root.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">
          WorldRoot is a home for text roleplay and collaborative storytelling. Characters, worlds, communities and the
          scenes you write together, in one place built for writing.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          {viewer ? (
            <Link href="/home" className={buttonClass('primary', 'lg')}>
              Go to your Home
            </Link>
          ) : (
            <>
              <Link href="/sign-up" className={buttonClass('primary', 'lg')}>
                Create an account
              </Link>
              <Link href="/sign-in" className={buttonClass('secondary', 'lg')}>
                Sign in
              </Link>
              {demoGuestEnabled() ? (
                <Link href="/sign-in#demo" className={buttonClass('ghost', 'lg')}>
                  Try The Demo
                </Link>
              ) : null}
            </>
          )}
        </div>

        <ul className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ title, body }) => (
            <li key={title} className="wr-glass rounded-2xl p-5">
              <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
            </li>
          ))}
        </ul>

        <Link
          href="/alternatives"
          className="group mt-12 block wr-glass rounded-2xl p-6 transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <h2 className="font-display text-xl font-semibold text-ink">Alternatives To Boycotted Franchises</h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-muted">
            Love a kind of story but stepped away from the franchise behind it? Start with Varrowmere, an original school of magic that is
            free for anyone to use.
          </p>
          <p className="mt-3 font-medium text-accent-text group-hover:underline">
            See the alternatives <span aria-hidden="true">→</span>
          </p>
        </Link>
      </main>

      <LegalLinks className="pb-8" />
    </div>
  );
}
