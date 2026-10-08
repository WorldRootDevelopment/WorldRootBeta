import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/features/identity/auth-card';
import { OnboardingForm } from '@/features/identity/onboarding-form';
import { safeNext } from '@/lib/next-path';
import { getViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Welcome' };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, '/home');
  const viewer = await getViewer();
  if (!viewer) redirect('/sign-in');
  if (viewer.profile) redirect(next);

  return (
    <AuthCard title="Choose your name" lead="This is you, the writer. Your characters come next and each has a name of its own.">
      <OnboardingForm next={next} />
    </AuthCard>
  );
}
