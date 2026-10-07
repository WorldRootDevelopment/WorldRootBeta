import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { loadCommunity } from '@/features/community/community-view';
import { JoinButton } from '@/features/community/join-button';
import { NavLink } from '@/features/shell/nav-link';

interface Props {
  params: Promise<{ community: string }>;
  children: ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { community } = await loadCommunity((await params).community);
  return { title: { default: community.name, template: `%s · ${community.name}` } };
}

const tabClass =
  'inline-flex min-h-11 items-center border-b-2 border-transparent px-1 text-sm font-medium text-ink-muted hover:text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export default async function CommunityLayout({ params, children }: Props) {
  const { community, isMember, memberCount } = await loadCommunity((await params).community);
  const base = `/c/${community.slug}`;

  return (
    // Everything inside takes the community's accent hue.
    <div className="wr-accent-scope" style={{ '--wr-accent-hue': community.accentHue } as CSSProperties}>
      <header className="rounded-2xl bg-accent-soft p-6 md:p-8">
        <p className="text-sm font-medium text-accent-text">Community</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">{community.name}</h1>
        {community.tagline ? <p className="mt-2 max-w-2xl text-ink">{community.tagline}</p> : null}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {isMember ? (
            <span className="inline-flex min-h-8 items-center rounded-full bg-surface-raised px-3 text-sm font-medium text-accent-text">
              You are a member
            </span>
          ) : (
            <JoinButton communityId={community.id} />
          )}
          <span className="text-sm text-ink-muted">
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>
      </header>

      <nav aria-label={community.name} className="mb-8 mt-2 flex gap-6 border-b border-line">
        <NavLink href={base} exact className={tabClass} activeClassName="border-accent text-ink">
          Overview
        </NavLink>
        <NavLink href={`${base}/worlds`} className={tabClass} activeClassName="border-accent text-ink">
          Worlds
        </NavLink>
        <NavLink href={`${base}/characters`} className={tabClass} activeClassName="border-accent text-ink">
          Characters
        </NavLink>
      </nav>

      {children}
    </div>
  );
}
