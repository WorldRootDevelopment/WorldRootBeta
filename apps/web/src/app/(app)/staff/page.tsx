import { BADGES } from '@worldroot/contracts';
import { getSeason, getSeasonMode, listAllCommunities, listCodeBatches, listReports, searchAccounts } from '@worldroot/core';
import { Button, buttonClass } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badges } from '@/features/identity/badges';
import { ReportQueue } from '@/features/moderation/report-client';
import { PageHeader } from '@/features/shell/page-header';
import { SectionHeading } from '@/features/shell/prose';
import { AccountControls } from '@/features/staff/account-controls';
import { CodeBatchForm } from '@/features/staff/code-batch-form';
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
  const [accounts, communities, reports, season, seasonMode, batches] = await Promise.all([
    searchAccounts(db, viewer.actor, query),
    listAllCommunities(db, viewer.actor),
    listReports(db, viewer.actor, 'platform'),
    getSeason(db),
    getSeasonMode(db),
    listCodeBatches(db, viewer.actor),
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

      <SectionHeading>Uploads</SectionHeading>
      <p className="mb-4 max-w-2xl text-sm text-ink-muted">
        Pictures are not scanned. Look over what has been uploaded recently and take down anything that breaks the rules.
      </p>
      <Link href="/staff/uploads" className={buttonClass('secondary')}>
        Recent Uploads
      </Link>

      <SectionHeading>Backer Codes</SectionHeading>
      <p className="mb-4 max-w-2xl text-sm text-ink-muted">
        Kickstarter does not let other sites check who backed a project, so backers claim their rewards with a code. Paste a column from
        the backer report, download the codes, and send each backer theirs through Kickstarter&rsquo;s backer survey or a message. They
        enter it under Settings, Account. Each code works once.
      </p>
      <CodeBatchForm />
      {batches.length > 0 ? (
        <ul className="mt-6 flex max-w-2xl flex-col divide-y divide-line">
          {batches.map((batch) => (
            <li key={batch.batch} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
              <span className="font-medium text-ink">{batch.batch}</span>
              <span className="text-ink-muted">
                {[batch.grantsHeartwood ? (batch.grantsMonths ? `Heartwood For ${batch.grantsMonths} ${batch.grantsMonths === 1 ? 'Month' : 'Months'}` : 'Heartwood With No End') : null, batch.grantsBadge ? BADGES[batch.grantsBadge].label + ' Badge' : null].filter(Boolean).join(' + ')} ·{' '}
                {batch.redeemed.toLocaleString('en')} Of {batch.total.toLocaleString('en')} Redeemed
              </span>
            </li>
          ))}
        </ul>
      ) : null}

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
        Heartwood is set by hand here until billing exists.
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
