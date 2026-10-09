import { buttonClass, Wordmark } from '@worldroot/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { textLinkClass } from '@/features/identity/auth-card';

/** The day the privacy policy and the terms last changed. Change it whenever either page's wording does. */
export const LEGAL_UPDATED = 'October 9, 2026';

/**
 * Where people write to about their data or these pages. Read from the server's
 * settings so the address is never in the source code; pages that show it must
 * be rendered per request, or the address is fixed at build time.
 */
export function contactEmail(): string | null {
  return process.env.WORLDROOT_CONTACT_EMAIL?.trim() || null;
}

/** How to reach the people who run WorldRoot, as a sentence fragment. */
export function Contact() {
  const email = contactEmail();
  if (!email) return <>message a Rootwarden on WorldRoot</>;
  return (
    <>
      write to{' '}
      <a href={`mailto:${email}`} className={textLinkClass}>
        {email}
      </a>
    </>
  );
}

/** One headed part of a legal page. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-ink-muted [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}

/** The frame shared by the privacy policy and the terms. Open to everyone, signed in or not. */
export function LegalPage({ title, lead, children }: { title: string; lead: ReactNode; children: ReactNode }) {
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

      <main className="py-10">
        <h1 className="wr-title w-fit pb-1 font-display text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">Last updated {LEGAL_UPDATED}</p>
        <p className="mt-6 text-lg leading-relaxed text-ink-muted">{lead}</p>
        {children}
      </main>

      <LegalLinks className="pb-8" />
    </div>
  );
}

/** The two links every public page carries. */
export function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <footer className={`flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted ${className}`}>
      <Link href="/privacy" className={textLinkClass}>
        Privacy Policy
      </Link>
      <Link href="/terms" className={textLinkClass}>
        Terms Of Service
      </Link>
    </footer>
  );
}
