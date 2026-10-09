import { getAccountForStaff } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badges } from '@/features/identity/badges';
import { ImageUpload } from '@/features/media/image-upload';
import { Picture } from '@/features/shell/picture';
import { Breadcrumbs, SectionHeading } from '@/features/shell/prose';
import { SignOutEverywhereButton, SuspensionPanel } from '@/features/staff/account-actions';
import { AccountControls } from '@/features/staff/account-controls';
import { load } from '@/lib/load';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Manage Account' };

const day = (date: Date) => date.toLocaleDateString('en', { dateStyle: 'medium' });
const moment = (date: Date) => date.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });
const link = 'rounded font-medium text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

// What the audit log's action keys mean, in words.
const ACTIONS: Record<string, string> = {
  'platform.account.suspend': 'Suspended',
  'platform.account.restore': 'Restored',
  'platform.account.sign_out': 'Signed out of every device',
  'platform.badge.grant': 'Given a badge',
  'platform.badge.revoke': 'Badge taken away',
  'platform.premium.grant': 'Given Premium',
  'platform.premium.revoke': 'Premium taken away',
  'platform.avatar.remove': 'Profile picture removed',
  'platform.banner.remove': 'Banner removed',
};

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-ink">{children}</dd>
    </div>
  );
}

/** One account, for WorldRoot staff: what it is, what it has done, and what can be done about it. */
export default async function StaffAccountPage({ params }: { params: Promise<{ userId: string }> }) {
  const viewer = await requireViewer();
  if (viewer.actor.platformRole !== 'staff') notFound();
  const { userId } = await params;
  const { db } = await database();
  const account = await load(() => getAccountForStaff(db, viewer.actor, userId));
  const name = account.profile?.displayName ?? account.email;
  const isSelf = account.userId === viewer.actor.userId;
  const cannotSuspend = isSelf ? 'This is your own account. You cannot suspend yourself.' : account.isStaff ? 'This is a Rootwarden. Rootwardens are set in the server’s settings and cannot be suspended from here.' : null;

  return (
    <>
      <Breadcrumbs items={[{ label: 'Rootwardens', href: '/staff' }, { label: name }]} />

      <header className="wr-glass flex flex-wrap items-center gap-5 rounded-3xl p-5 md:p-6">
        <Picture mediaId={account.profile?.avatarId} name={name} className="size-20 text-3xl" />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-3 font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
            {name}
            <Badges list={account.badges} all />
          </h1>
          <p className="mt-1 text-ink-muted">
            {account.profile ? `@${account.profile.handle} · ` : 'Has not finished setting up · '}
            {account.email}
          </p>
          {account.suspendedAt ? (
            <p role="status" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              <span className="font-semibold">Suspended since {moment(account.suspendedAt)}.</span> {account.suspensionReason}
            </p>
          ) : null}
        </div>
        {account.profile ? (
          <Link href={`/u/${account.profile.handle}`} className={buttonClass('secondary')}>
            View profile
          </Link>
        ) : null}
      </header>

      <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Joined">{day(account.createdAt)}</Fact>
        <Fact label="Last Seen">{account.profile?.lastSeenAt ? moment(account.profile.lastSeenAt) : 'Never'}</Fact>
        <Fact label="Signed In On">
          {account.sessions} {account.sessions === 1 ? 'device' : 'devices'}
        </Fact>
        <Fact label="Open Reports About Them">{account.openReports}</Fact>
        <Fact label="Characters">{account.characters}</Fact>
        <Fact label="Posts">{account.posts}</Fact>
        <Fact label="Status Line">{account.profile?.status ?? 'None'}</Fact>
        <Fact label="Role">{account.isStaff ? 'Rootwarden' : 'Member'}</Fact>
      </dl>

      <SectionHeading>Suspension</SectionHeading>
      <p className="mb-4 max-w-2xl text-sm text-ink-muted">
        A suspended account is signed out everywhere and cannot use WorldRoot until it is restored. Nothing the person wrote is removed.
      </p>
      <SuspensionPanel userId={account.userId} name={name} suspended={Boolean(account.suspendedAt)} blocked={cannotSuspend} />

      <SectionHeading>Sign-In</SectionHeading>
      <p className="mb-4 max-w-2xl text-sm text-ink-muted">If the account may be in the wrong hands, sign it out everywhere. The owner can sign in again with their password.</p>
      <SignOutEverywhereButton userId={account.userId} sessions={account.sessions} />

      <SectionHeading>Badges And Premium</SectionHeading>
      <p className="mb-4 text-sm text-ink-muted">Press a label to give or take away that badge.</p>
      <AccountControls userId={account.userId} badges={account.badges} />

      {account.profile && !isSelf && (account.profile.avatarId || account.profile.bannerId) ? (
        <>
          <SectionHeading>Pictures</SectionHeading>
          <div className="flex flex-col gap-5">
            {account.profile.avatarId ? (
              <ImageUpload url={`/api/v1/staff/accounts/${account.userId}/avatar`} mediaId={account.profile.avatarId} name={name} label="Profile Picture" removeOnly />
            ) : null}
            {account.profile.bannerId ? (
              <ImageUpload url={`/api/v1/staff/accounts/${account.userId}/banner`} mediaId={account.profile.bannerId} name={name} label="Banner" shape="banner" removeOnly />
            ) : null}
          </div>
        </>
      ) : null}

      <SectionHeading>Communities</SectionHeading>
      {account.communities.length === 0 ? (
        <p className="text-ink-muted">Not in any community.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {account.communities.map((community) => (
            <li key={community.slug}>
              <Link href={`/c/${community.slug}`} className="inline-flex min-h-9 items-center rounded-full border border-line-strong px-3 text-sm font-medium text-ink hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                {community.name}
                {community.owner ? <span className="ml-1.5 text-ink-muted">· owner</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <SectionHeading>History</SectionHeading>
      {account.history.length === 0 ? (
        <p className="text-ink-muted">The Rootwardens have not done anything to this account.</p>
      ) : (
        <ol className="wr-glass flex max-w-3xl flex-col divide-y divide-line rounded-2xl">
          {account.history.map((entry, index) => (
            <li key={index} className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3 text-sm">
              <span className="text-ink">
                {ACTIONS[entry.action] ?? entry.action}
                {entry.by ? (
                  <>
                    {' '}
                    by{' '}
                    <Link href={`/u/${entry.by}`} className={link}>
                      @{entry.by}
                    </Link>
                  </>
                ) : null}
              </span>
              <time dateTime={entry.at.toISOString()} className="text-ink-muted">
                {moment(entry.at)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
