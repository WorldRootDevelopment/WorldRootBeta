import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard, textLinkClass } from '@/features/identity/auth-card';
import { ForgotPasswordForm } from '@/features/identity/password-reset-forms';

export const metadata: Metadata = { title: 'Forgot Password' };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot Your Password?"
      lead="Enter the email address on your account and we will send a link to choose a new one."
      footer={
        <Link href="/sign-in" className={textLinkClass}>
          Back To Sign In
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
