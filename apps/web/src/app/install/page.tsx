import { buttonClass, Wordmark } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLinks } from '@/features/legal/legal-page';
import { InstallAppButton } from '@/features/shell/install-app';

export const metadata: Metadata = { title: 'Get The App' };

const STEPS = [
  {
    device: 'Windows And Mac',
    browser: 'In Chrome Or Edge',
    steps: ['Open WorldRoot in Chrome or Edge.', 'Press the install icon at the right of the address bar: a small screen with an arrow.', 'Press Install. WorldRoot opens in its own window and is added to your Start menu or Dock.'],
  },
  {
    device: 'iPhone And iPad',
    browser: 'In Safari',
    steps: ['Open WorldRoot in Safari.', 'Press the Share button: a square with an arrow pointing up.', 'Choose Add to Home Screen, then Add.'],
  },
  {
    device: 'Android',
    browser: 'In Chrome',
    steps: ['Open WorldRoot in Chrome.', 'Press the three dots at the top right.', 'Choose Install app, or Add to Home screen.'],
  },
];

/** How to get WorldRoot as an app. Open to everyone, signed in or not. */
export default function InstallPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 md:px-8">
      <header className="flex h-16 items-center justify-between">
        <Link href="/" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
          <Wordmark />
        </Link>
        <Link href="/" className={buttonClass('ghost')}>
          Back
        </Link>
      </header>

      <main className="py-10">
        <h1 className="wr-title w-fit pb-1 font-display text-4xl font-bold tracking-tight md:text-5xl">Get The App</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
          Install WorldRoot and it opens in its own window, with its own icon, like any other app on your computer or phone. It is free, it is
          small, and it stays up to date by itself.
        </p>

        <div className="mt-8">
          <InstallAppButton />
        </div>

        <h2 className="mb-4 mt-12 font-display text-xl font-semibold text-ink">By Hand, On Any Device</h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ device, browser, steps }) => (
            <li key={device} className="wr-glass rounded-2xl p-5">
              <h3 className="font-display text-lg font-semibold text-ink">{device}</h3>
              <p className="text-sm text-ink-muted">{browser}</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink">
                {steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </li>
          ))}
        </ul>

        <h2 className="mb-2 mt-12 font-display text-xl font-semibold text-ink">Is There A Download?</h2>
        <p className="max-w-2xl leading-relaxed text-ink-muted">
          There is no installer file to download, and you do not need one. WorldRoot is a web app: your browser installs it straight from this
          site, which means nothing to run, nothing to update by hand, and no warnings from your computer about unknown programs. Firefox does not
          install web apps on a computer; use Chrome or Edge for that.
        </p>
      </main>

      <LegalLinks className="pb-8" />
    </div>
  );
}
