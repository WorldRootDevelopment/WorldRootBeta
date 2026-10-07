import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard, textLinkClass } from '@/features/identity/auth-card';
import { OAuthButtons, type OAuthProvider } from '@/features/identity/oauth-buttons';
import { SignUpForm } from '@/features/identity/sign-up-form';
import { oauthProviders } from '@/lib/server';
import { getViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Create an account' };

export default async function SignUpPage() {
  if (await getViewer()) redirect('/home');
  const providers = (Object.keys(oauthProviders) as OAuthProvider[]).filter((key) => oauthProviders[key]);

  return (
    <AuthCard
      title="Create your account"
      lead="One account for every character, world and community."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/sign-in" className={textLinkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <OAuthButtons providers={providers} />
      <SignUpForm />
    </AuthCard>
  );
}
