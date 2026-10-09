import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard, textLinkClass } from '@/features/identity/auth-card';
import { OAuthButtons, type OAuthProvider } from '@/features/identity/oauth-buttons';
import { oauthError } from '@/features/identity/oauth-errors';
import { SignUpForm } from '@/features/identity/sign-up-form';
import { safeNext } from '@/lib/next-path';
import { oauthProviders } from '@/lib/server';
import { getViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Create An Account' };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const query_ = await searchParams;
  const problem = oauthError(typeof query_.error === 'string' ? query_.error : undefined);
  const next = safeNext(query_.next, '/home');
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
            Sign In
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
      <SignUpForm next={next} />
      <p className="mt-6 text-sm text-ink-muted">
        WorldRoot is for people aged 18 and over. By creating an account you agree to the{' '}
        <Link href="/terms" className={textLinkClass}>
          Terms Of Service
        </Link>{' '}
        and the{' '}
        <Link href="/privacy" className={textLinkClass}>
          Privacy Policy
        </Link>
        .
      </p>
    </AuthCard>
  );
}
