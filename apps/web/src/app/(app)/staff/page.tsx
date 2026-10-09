import { getSeason, getSeasonMode, listAllCommunities, listReports, searchAccounts } from '@worldroot/core';
import { Button, buttonClass } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badges } from '@/features/identity/badges';
import { ReportQueue } from '@/features/moderation/report-client';
import { PageHeader } from '@/features/shell/page-header';
import { SectionHeading } from '@/features/shell/prose';
import { AccountControls } from '@/features/staff/account-controls';
import { SeasonPicker } from '@/features/staff/season-picker';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Rootwardens' };

const link = 'rounded font-medium text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** The staff portal. To anyone who is not WorldRoot staff, this page does not exist. */
export default async function StaffPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requireViewer();
  if (viewer.actor.platformRole !== 'staff') notFound();
  const query = ((await searchParams).q ?? '').slice(0, 100);
  const { db } = await database();
  const [accounts, communities, reports, season, seasonMode] = await Promise.all([
    searchAccounts(db, viewer.actor, query),
    listAllCommunities(db, viewer.actor),
    listReports(db, viewer.actor, 'platform'),
    getSeason(db),
    getSeasonMode(db),
  ]);

  return (
    <>
      <PageHeader title="Rootwardens" lead="For the Rootwardens, WorldRoot’s staff, only. Everything done here is written to the audit log." />

      <SectionHeading>Reports</SectionHeading>
      <p className="mb-4 max-w-2xl text-sm text-ink-muted">
        Reports about direct messages, private scenes and profiles, and any report of possible harm or law-breaking from inside a
        community. Reports a community can handle itself go to that community’s own reviewers.
      </p>
      <ReportQueue reports={reports} emptyText="Nothing is waiting for review." />

      <SectionHeading>Site Look</SectionHeading>
      <p className="mb-4 max-w-2xl text-sm text-ink-muted">
        Dress the whole site for an occasion. Left on Automatic, each look comes on at its own time of year; or hold one on yourself. A look changes the logo and titles, button colors, the light behind the page, and adds an illustrated banner
        across the top and a few drifting shapes, for everyone, at once. Text and each community’s own color stay as they are.
      </p>
      <SeasonPicker mode={seasonMode} showing={season} />

      <SectionHeading>Accounts</SectionHeading>
      <form className="mb-5 flex max-w-xl gap-2">
        <label htmlFor="staff-search" className="sr-only">
          Search Accounts By Handle, Name Or Email
        </label>
        <input
          id="staff-search"
          name="q"
          defaultValue={query}
          placeholder="Handle, Name Or Email"
          className="min-h-11 w-full rounded-lg border border-line-strong bg-surface-raised px-3 text-base text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      <p className="mb-3 text-sm text-ink-muted">
        {query ? `${accounts.length} matching` : `The ${accounts.length} newest accounts`}. Press a label to give or take away that badge, or Manage to suspend, sign out or review an account.
        Premium is set by hand here until billing exists.
      </p>
      <ul className="flex flex-col gap-3">
        {accounts.map((account) => (
          <li key={account.userId} className="wr-glass rounded-2xl p-5">
            <p className="flex flex-wrap items-center gap-2">
              <Link href={`/staff/accounts/${account.userId}`} className={link}>
                {account.displayName ?? 'Not Set Up Yet'}
              </Link>
              {account.handle ? <span className="text-sm text-ink-muted">@{account.handle}</span> : null}
              <Badges list={account.badges} all />
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {account.email} · Joined {account.createdAt.toLocaleDateString('en', { dateStyle: 'medium' })}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <AccountControls userId={account.userId} badges={account.badges} />
              <Link href={`/staff/accounts/${account.userId}`} className={buttonClass('secondary')}>
                Manage
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <SectionHeading>Communities</SectionHeading>
      <p className="mb-3 text-sm text-ink-muted">Every community, including unlisted and archived ones. As a Rootwarden you can open and manage any of them.</p>
      <ul className="flex flex-col divide-y divide-line wr-glass rounded-2xl">
        {communities.map((community) => (
          <li key={community.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
            <Link href={`/c/${community.slug}`} className={link}>
              {community.name}
            </Link>
            <span className="text-ink-muted">
              {community.memberCount} {community.memberCount === 1 ? 'Member' : 'Members'}
              {community.listed ? '' : ' · Unlisted'}
              {community.archivedAt ? ' · Archived' : ''}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
