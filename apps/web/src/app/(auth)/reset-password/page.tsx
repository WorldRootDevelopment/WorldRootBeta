import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard, textLinkClass } from '@/features/identity/auth-card';
import { ResetPasswordForm } from '@/features/identity/password-reset-forms';

export const metadata: Metadata = { title: 'Choose A New Password' };

/** Where the emailed reset link lands, with its token, or with an error if the token was no good. */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  const usable = typeof token === 'string' && token.length > 0 && !error;
  return (
    <AuthCard
      title="Choose A New Password"
      footer={
        <Link href="/sign-in" className={textLinkClass}>
          Back To Sign In
        </Link>
      }
    >
      {usable ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-danger">
          This link has expired or was already used.{' '}
          <Link href="/forgot-password" className={textLinkClass}>
            Ask For A New One
          </Link>
        </p>
      )}
    </AuthCard>
  );
}
