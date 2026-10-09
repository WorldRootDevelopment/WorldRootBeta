import { listAllCommunities, listReports, searchAccounts } from '@worldroot/core';
import { Button } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badges } from '@/features/identity/badges';
import { ReportQueue } from '@/features/moderation/report-client';
import { PageHeader } from '@/features/shell/page-header';
import { SectionHeading } from '@/features/shell/prose';
import { AccountControls } from '@/features/staff/account-controls';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Staff' };

const link = 'rounded font-medium text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** The staff portal. To anyone who is not WorldRoot staff, this page does not exist. */
export default async function StaffPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requireViewer();
  if (viewer.actor.platformRole !== 'staff') notFound();
  const query = ((await searchParams).q ?? '').slice(0, 100);
  const { db } = await database();
  const [accounts, communities, reports] = await Promise.all([
    searchAccounts(db, viewer.actor, query),
    listAllCommunities(db, viewer.actor),
    listReports(db, viewer.actor, 'platform'),
  ]);

  return (
    <>
      <PageHeader title="Staff" lead="For WorldRoot staff only. Everything done here is written to the audit log." />

      <SectionHeading>Reports</SectionHeading>
      <p className="mb-4 max-w-2xl text-sm text-ink-muted">
        Reports about direct messages, private scenes and profiles, and any report of possible harm or law-breaking from inside a
        community. Reports a community can handle itself go to that community’s own reviewers.
      </p>
      <ReportQueue reports={reports} emptyText="Nothing is waiting for review." />

      <SectionHeading>Accounts</SectionHeading>
      <form className="mb-5 flex max-w-xl gap-2">
        <label htmlFor="staff-search" className="sr-only">
          Search accounts by handle, name or email
        </label>
        <input
          id="staff-search"
          name="q"
          defaultValue={query}
          placeholder="Handle, name or email"
          className="min-h-11 w-full rounded-lg border border-line-strong bg-surface-raised px-3 text-base text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      <p className="mb-3 text-sm text-ink-muted">
        {query ? `${accounts.length} matching` : `The ${accounts.length} newest accounts`}. Press a label to give or take away that badge.
        Premium is set by hand here until billing exists.
      </p>
      <ul className="flex flex-col gap-3">
        {accounts.map((account) => (
          <li key={account.userId} className="wr-glass rounded-2xl p-5">
            <p className="flex flex-wrap items-center gap-2">
              {account.handle ? (
                <Link href={`/u/${account.handle}`} className={link}>
                  {account.displayName}
                </Link>
              ) : (
                <span className="font-medium text-ink-muted">Not set up yet</span>
              )}
              {account.handle ? <span className="text-sm text-ink-muted">@{account.handle}</span> : null}
              <Badges list={account.badges} />
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {account.email} · joined {account.createdAt.toLocaleDateString('en', { dateStyle: 'medium' })}
            </p>
            <div className="mt-3">
              <AccountControls userId={account.userId} badges={account.badges} />
            </div>
          </li>
        ))}
      </ul>

      <SectionHeading>Communities</SectionHeading>
      <p className="mb-3 text-sm text-ink-muted">Every community, including unlisted and archived ones. As staff you can open and manage any of them.</p>
      <ul className="flex flex-col divide-y divide-line wr-glass rounded-2xl">
        {communities.map((community) => (
          <li key={community.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
            <Link href={`/c/${community.slug}`} className={link}>
              {community.name}
            </Link>
            <span className="text-ink-muted">
              {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
              {community.listed ? '' : ' · unlisted'}
              {community.archivedAt ? ' · archived' : ''}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
