import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard, textLinkClass } from '@/features/identity/auth-card';
import { OAuthButtons, type OAuthProvider } from '@/features/identity/oauth-buttons';
import { SignUpForm } from '@/features/identity/sign-up-form';
import { safeNext } from '@/lib/next-path';
import { oauthProviders } from '@/lib/server';
import { getViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Create An Account' };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, '/home');
  const query = next === '/home' ? '' : `?next=${encodeURIComponent(next)}`;
  if (await getViewer()) redirect(next);
  const providers = (Object.keys(oauthProviders) as OAuthProvider[]).filter((key) => oauthProviders[key]);

  return (
    <AuthCard
      title="Create Your Account"
      lead="One account for every character, world and community."
      footer={
        <>
          Already have an account?{' '}
          <Link href={`/sign-in${query}`} className={textLinkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <OAuthButtons providers={providers} next={next} />
      <SignUpForm next={next} />
    </AuthCard>
  );
}
