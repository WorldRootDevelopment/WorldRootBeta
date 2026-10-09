import {
  CONTENT_RATING_LABELS,
  isLfrpGenre,
  LFRP_GENRE_KEYS,
  LFRP_GENRES,
  LFRP_KINDS,
  LFRP_PACES,
  MAX_OPEN_LFRP,
  type ContentRating,
  type LfrpGenre,
  type LfrpKind,
  type LfrpPace,
} from '@worldroot/contracts';
import { listListings, type ListingRow } from '@worldroot/core';
import { buttonClass, EmptyState } from '@worldroot/ui';
import { PenLine } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DiscoverTabs } from '@/features/discover/discover-tabs';
import { MessageAuthorButton, RemoveListingButton } from '@/features/discover/listing-client';
import { Badges } from '@/features/identity/badges';
import { ReportButton } from '@/features/moderation/report-client';
import { PageHeader } from '@/features/shell/page-header';
import { Prose, SectionHeading } from '@/features/shell/prose';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Looking for RP' };

const chip = 'rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-ink-muted';
const filterLink =
  'inline-flex min-h-9 items-center rounded-full border border-line-strong px-3 text-sm font-medium text-ink-muted hover:text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const filterOn = 'border-accent bg-accent-soft text-accent-text hover:text-accent-text';

const day = (date: Date) => date.toLocaleDateString('en', { dateStyle: 'medium' });

function Listing({ row, isStaff }: { row: ListingRow; isStaff: boolean }) {
  const { listing, author } = row;
  return (
    <article className="wr-glass rounded-2xl p-5">
      <h3 className="font-display text-lg font-semibold text-ink">{listing.title}</h3>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
        <Link href={`/u/${author.handle}`} className="font-medium text-ink hover:underline">
          {author.displayName}
        </Link>
        <span>@{author.handle}</span>
        <Badges list={author.badges} />
        <span aria-hidden="true">·</span>
        <time dateTime={listing.createdAt.toISOString()}>{day(listing.createdAt)}</time>
      </p>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Details">
        {listing.genres.filter(isLfrpGenre).map((genre) => (
          <li key={genre} className={chip}>
            {LFRP_GENRES[genre]}
          </li>
        ))}
        <li className={chip}>{LFRP_KINDS[listing.kind as LfrpKind] ?? listing.kind}</li>
        <li className={chip}>{LFRP_PACES[listing.pace as LfrpPace] ?? listing.pace}</li>
        <li className={chip}>{CONTENT_RATING_LABELS[listing.rating as ContentRating] ?? listing.rating}</li>
      </ul>
      <Prose text={listing.body} className="mt-4" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {row.mine ? (
          <>
            <p className="text-sm text-ink-muted">{row.expired ? `Lapsed on ${day(listing.expiresAt)}. Nobody else can see it.` : `Up until ${day(listing.expiresAt)}.`}</p>
            <RemoveListingButton listingId={listing.id} />
          </>
        ) : (
          <>
            <MessageAuthorButton handle={author.handle} />
            <div className="flex items-center gap-4">
              {isStaff ? <RemoveListingButton listingId={listing.id} /> : null}
              <ReportButton targetType="lfrp" targetId={listing.id} />
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export default async function PartnersPage({ searchParams }: { searchParams: Promise<{ genre?: string | string[] }> }) {
  const viewer = await requireViewer();
  const { genre: raw } = await searchParams;
  const genre: LfrpGenre | null = isLfrpGenre(raw) ? raw : null;
  const { db } = await database();
  const rows = await listListings(db, viewer.actor, { genre });
  const mine = rows.filter((row) => row.mine);
  const others = rows.filter((row) => !row.mine);
  const open = mine.filter((row) => !row.expired).length;

  return (
    <>
      <PageHeader title="Discover" lead="Communities to join, and writers looking for a partner." />
      <DiscoverTabs />

      <div className="mb-8 flex flex-wrap items-center gap-4">
        {open < MAX_OPEN_LFRP ? (
          <Link href="/discover/partners/new" className={buttonClass('primary')}>
            Post a listing
          </Link>
        ) : (
          <p className="text-sm text-ink-muted">You have {MAX_OPEN_LFRP} listings open, which is the most allowed. Take one down to post another.</p>
        )}
      </div>

      {mine.length > 0 ? (
        <>
          <SectionHeading>Your listings</SectionHeading>
          <ul className="mb-4 flex max-w-3xl flex-col gap-4">
            {mine.map((row) => (
              <li key={row.listing.id}>
                <Listing row={row} isStaff={false} />
              </li>
            ))}
          </ul>
          <SectionHeading>From other writers</SectionHeading>
        </>
      ) : null}

      <nav aria-label="Filter by genre" className="mb-6 flex max-w-3xl flex-wrap gap-2">
        <Link href="/discover/partners" aria-current={genre ? undefined : 'true'} className={`${filterLink} ${genre ? '' : filterOn}`}>
          All
        </Link>
        {LFRP_GENRE_KEYS.map((key) => (
          <Link key={key} href={`/discover/partners?genre=${key}`} aria-current={genre === key ? 'true' : undefined} className={`${filterLink} ${genre === key ? filterOn : ''}`}>
            {LFRP_GENRES[key]}
          </Link>
        ))}
      </nav>

      {others.length === 0 ? (
        <EmptyState icon={<PenLine className="size-8" aria-hidden="true" />} title={genre ? `Nobody is looking for ${LFRP_GENRES[genre].toLowerCase()} right now` : 'No listings yet'}>
          Say what you would like to write and let a partner find you.
        </EmptyState>
      ) : (
        <ul className="flex max-w-3xl flex-col gap-4">
          {others.map((row) => (
            <li key={row.listing.id}>
              <Listing row={row} isStaff={viewer.actor.platformRole === 'staff'} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
