import { listListedCommunities, listMyCommunities, type Community } from '@worldroot/core';
import { buttonClass, EmptyState } from '@worldroot/ui';
import { Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { PageHeader } from '@/features/shell/page-header';
import { cardClass, SectionHeading } from '@/features/shell/prose';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Communities' };

function CommunityCard({ community }: { community: Community }) {
  return (
    <Link
      href={`/c/${community.slug}`}
      className={`wr-accent-scope ${cardClass}`}
      style={{ '--wr-accent-hue': community.accentHue } as CSSProperties}
    >
      <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-xl bg-accent-soft font-serif text-lg font-semibold text-accent-text">
        {community.name.charAt(0)}
      </span>
      <h3 className="mt-3 font-serif text-lg font-semibold text-ink">{community.name}</h3>
      {community.tagline ? <p className="mt-1 text-sm leading-relaxed text-ink-muted">{community.tagline}</p> : null}
    </Link>
  );
}

export default async function CommunitiesPage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const [mine, listed] = await Promise.all([listMyCommunities(db, viewer.actor.userId), listListedCommunities(db)]);
  const mineIds = new Set(mine.map((community) => community.id));
  const others = listed.filter((community) => !mineIds.has(community.id));

  return (
    <>
      <PageHeader title="Communities" lead="The communities you belong to." />
      <div className="mb-10">
        <Link href="/communities/new" className={buttonClass('primary')}>
          New community
        </Link>
      </div>

      {mine.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mine.map((community) => (
            <li key={community.id}>
              <CommunityCard community={community} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Users className="size-8" aria-hidden="true" />} title="No communities yet">
          {others.length > 0 ? 'Join one of the open communities below.' : 'Start one of your own, or join one when you are invited.'}
        </EmptyState>
      )}

      {/* Stands in for Discover until it is built. */}
      {others.length > 0 ? (
        <>
          <SectionHeading>Open to join</SectionHeading>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {others.map((community) => (
              <li key={community.id}>
                <CommunityCard community={community} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
