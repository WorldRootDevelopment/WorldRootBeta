import { Wordmark } from '@worldroot/ui';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SignOutButton } from '@/features/identity/sign-out-button';
import { getViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Account Suspended' };

/** The one page a suspended account can see. Anyone else is sent on their way. */
export default async function SuspendedPage() {
  const viewer = await getViewer();
  if (!viewer) redirect('/sign-in');
  if (!viewer.suspended) redirect('/home');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8">
        <Wordmark />
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">This Account Is Suspended</h1>
      <p className="mt-3 text-ink-muted">The Rootwardens, WorldRoot’s staff, have suspended this account, so it cannot be used for now. Your characters, worlds and writing have not been removed.</p>
      {viewer.suspended.reason ? (
        <div className="wr-glass mt-6 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Reason given</p>
          <p className="mt-1 text-ink">{viewer.suspended.reason}</p>
        </div>
      ) : null}
      <div className="mt-8">
        <SignOutButton />
      </div>
    </main>
  );
}
