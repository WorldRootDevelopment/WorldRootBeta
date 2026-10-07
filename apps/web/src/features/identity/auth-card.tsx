import { Wordmark } from '@worldroot/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  lead?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/** The centred card used by sign-in, sign-up and onboarding. */
export function AuthCard({ title, lead, footer, children }: AuthCardProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 self-start rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
        <Wordmark />
      </Link>
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">{title}</h1>
      {lead ? <p className="mt-2 text-ink-muted">{lead}</p> : null}
      <div className="mt-8">{children}</div>
      {footer ? <p className="mt-8 text-sm text-ink-muted">{footer}</p> : null}
    </main>
  );
}

export const textLinkClass =
  'font-medium text-accent-text underline underline-offset-2 hover:no-underline ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
