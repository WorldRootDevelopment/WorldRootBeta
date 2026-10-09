import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard, textLinkClass } from '@/features/identity/auth-card';
import { OAuthButtons, type OAuthProvider } from '@/features/identity/oauth-buttons';
import { oauthError } from '@/features/identity/oauth-errors';
import { SignInForm } from '@/features/identity/sign-in-form';
import { safeNext } from '@/lib/next-path';
import { DEMO_GUEST } from '@worldroot/core';
import { DemoSignIn } from '@/features/identity/demo-sign-in';
import { demoGuestEnabled, oauthProviders } from '@/lib/server';
import { getViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign In' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const query_ = await searchParams;
  const problem = oauthError(typeof query_.error === 'string' ? query_.error : undefined);
  const next = safeNext(query_.next, '/home');
  const query = next === '/home' ? '' : `?next=${encodeURIComponent(next)}`;
  if (await getViewer()) redirect(next);
  const providers = (Object.keys(oauthProviders) as OAuthProvider[]).filter((key) => oauthProviders[key]);

  return (
    <AuthCard
      title="Welcome Back"
      footer={
        <>
          New to WorldRoot?{' '}
          <Link href={`/sign-up${query}`} className={textLinkClass}>
            Create An Account
          </Link>
        </>
      }
    >
      {problem ? (
        <p role="alert" className="mb-6 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {problem}
        </p>
      ) : null}
      <OAuthButtons providers={providers} next={next} />
      <SignInForm next={next} />
      {demoGuestEnabled() ? <DemoSignIn email={DEMO_GUEST.email} password={DEMO_GUEST.password} /> : null}
      <p className="mt-6 text-sm text-ink-muted">
        <Link href="/terms" className={textLinkClass}>
          Terms Of Service
        </Link>
        {' · '}
        <Link href="/privacy" className={textLinkClass}>
          Privacy Policy
        </Link>
      </p>
    </AuthCard>
  );
}
