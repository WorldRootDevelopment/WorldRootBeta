import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard, textLinkClass } from '@/features/identity/auth-card';
import { OnboardingForm } from '@/features/identity/onboarding-form';
import { SignOutButton } from '@/features/identity/sign-out-button';
import { safeNext } from '@/lib/next-path';
import { getViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Welcome' };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, '/home');
  const viewer = await getViewer();
  if (!viewer) redirect('/sign-in');
  if (viewer.profile) redirect(next);

  return (
    <AuthCard
      title="Choose Your Name"
      lead="This is you, the writer. Your characters come next and each has a name of its own."
      footer={
        // Someone can land here without meaning to: a first sign-in with Discord or Google makes an account
        // on the spot. They need to see that they are signed in, as whom, and how to back out.
        <span className="flex flex-col items-start gap-3">
          <span>
            You are signed in as <strong className="font-semibold text-ink">{viewer.email}</strong>. Your account is not finished until you
            choose a name.
          </span>
          <span className="flex flex-wrap items-center gap-4">
            <SignOutButton />
            <Link href="/" className={textLinkClass}>
              Back To The Front Page
            </Link>
          </span>
        </span>
      }
    >
      <OnboardingForm next={next} />
    </AuthCard>
  );
}
