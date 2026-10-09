import { discoverCommunities } from '@worldroot/core';
import { buttonClass, EmptyState } from '@worldroot/ui';
import { Compass } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { DiscoverTabs } from '@/features/discover/discover-tabs';
import { PageHeader } from '@/features/shell/page-header';
import { cardClass } from '@/features/shell/prose';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Discover' };

const field =
  'min-h-11 w-full rounded-lg border border-line-strong bg-surface-raised px-3 text-base text-ink placeholder:text-ink-muted ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const viewer = await requireViewer();
  const { q } = await searchParams;
  const query = (typeof q === 'string' ? q : '').slice(0, 80);
  const { db } = await database();
  const found = await discoverCommunities(db, viewer.actor, query);

  return (
    <>
      <PageHeader title="Discover" lead="Communities to join, and writers looking for a partner." />
      <DiscoverTabs />

      <form action="/discover" role="search" className="mb-8 flex max-w-xl gap-2">
        <label htmlFor="discover-q" className="sr-only">
          Search Communities
        </label>
        <input id="discover-q" name="q" type="search" defaultValue={query} maxLength={80} placeholder="Search Communities By Name" className={field} />
        <button type="submit" className={buttonClass('secondary')}>
          Search
        </button>
      </form>

      {found.length === 0 ? (
        <EmptyState icon={<Compass className="size-8" aria-hidden="true" />} title={query ? 'No Communities Match' : 'No Open Communities Yet'}>
          {query ? (
            <>
              Nothing matches “{query}”. <Link href="/discover" className="font-medium text-accent-text underline">Show All Communities</Link>.
            </>
          ) : (
            <>
              Communities appear here when their owners list them. <Link href="/communities/new" className="font-medium text-accent-text underline">Start One Of Your Own</Link>.
            </>
          )}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {found.map(({ community, memberCount, isMember }) => (
            <li key={community.id}>
              <Link href={`/c/${community.slug}`} className={`wr-accent-scope h-full ${cardClass}`} style={{ '--wr-accent-hue': community.accentHue } as CSSProperties}>
                <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-xl bg-accent-soft font-display text-lg font-semibold text-accent-text">
                  {community.name.charAt(0)}
                </span>
                <h2 className="mt-3 font-display text-lg font-semibold text-ink">{community.name}</h2>
                {community.tagline ? <p className="mt-1 text-sm leading-relaxed text-ink-muted">{community.tagline}</p> : null}
                <p className="mt-3 text-xs font-medium text-ink-muted">
                  {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
                  {isMember ? ' · You Are A Member' : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
