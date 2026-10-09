import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard, textLinkClass } from '@/features/identity/auth-card';
import { OAuthButtons, type OAuthProvider } from '@/features/identity/oauth-buttons';
import { SignInForm } from '@/features/identity/sign-in-form';
import { safeNext } from '@/lib/next-path';
import { oauthProviders } from '@/lib/server';
import { getViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign In' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, '/home');
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
            Create an account
          </Link>
        </>
      }
    >
      <OAuthButtons providers={providers} next={next} />
      <SignInForm next={next} />
    </AuthCard>
  );
}
