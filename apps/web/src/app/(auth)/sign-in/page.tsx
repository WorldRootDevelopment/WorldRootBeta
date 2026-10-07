import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard, textLinkClass } from '@/features/identity/auth-card';
import { OAuthButtons, type OAuthProvider } from '@/features/identity/oauth-buttons';
import { SignInForm } from '@/features/identity/sign-in-form';
import { oauthProviders } from '@/lib/server';
import { getViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage() {
  if (await getViewer()) redirect('/home');
  const providers = (Object.keys(oauthProviders) as OAuthProvider[]).filter((key) => oauthProviders[key]);

  return (
    <AuthCard
      title="Welcome back"
      footer={
        <>
          New to WorldRoot?{' '}
          <Link href="/sign-up" className={textLinkClass}>
            Create an account
          </Link>
        </>
      }
    >
      <OAuthButtons providers={providers} />
      <SignInForm />
    </AuthCard>
  );
}
