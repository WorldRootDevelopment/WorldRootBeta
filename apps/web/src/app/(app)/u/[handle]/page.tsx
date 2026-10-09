import { getProfileView, hasBlocked } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { CSSProperties } from 'react';
import { cache } from 'react';
import { BlockButton } from '@/features/identity/account-client';
import { Badges } from '@/features/identity/badges';
import { MessageButton } from '@/features/identity/profile-client';
import { ImageUpload } from '@/features/media/image-upload';
import { ReportButton } from '@/features/moderation/report-client';
import { Picture } from '@/features/shell/picture';
import { cardClass, Prose, SectionHeading } from '@/features/shell/prose';
import { load } from '@/lib/load';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

interface Props {
  params: Promise<{ handle: string }>;
}

const loadProfile = cache(async (handle: string) => {
  const viewer = await requireViewer();
  const { db } = await database();
  const view = await load(() => getProfileView(db, viewer.actor, decodeURIComponent(handle)));
  return { ...view, viewerIsStaff: viewer.actor.platformRole === 'staff', blocked: view.isSelf ? false : await hasBlocked(db, viewer.actor, view.profile.userId) };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { profile } = await loadProfile((await params).handle);
  return { title: `${profile.displayName} (@${profile.handle})` };
}

export default async function ProfilePage({ params }: Props) {
  const requested = decodeURIComponent((await params).handle);
  const { profile, isSelf, joinedAt, communities, characters, blocked, viewerIsStaff } = await loadProfile(requested);
  // Someone who has changed their handle is still found by the old one, and sent on to the new.
  if (requested.toLowerCase() !== profile.handle.toLowerCase()) redirect(`/u/${profile.handle}`);

  return (
    <>
      <header className="flex flex-wrap items-start gap-5">
        <Picture mediaId={profile.avatarId} name={profile.displayName} className="size-20 text-3xl" />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-3 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {profile.displayName}
            <Badges list={profile.badges} />
          </h1>
          <p className="mt-1 text-ink-muted">
            @{profile.handle}
            {profile.pronouns ? <span> · {profile.pronouns}</span> : null}
          </p>
          <p className="mt-1 text-sm text-ink-muted">Joined {joinedAt.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</p>
        </div>
        {isSelf ? (
          <Link href="/settings/profile" className={buttonClass('secondary')}>
            Edit profile
          </Link>
        ) : (
          <div className="flex flex-wrap items-start gap-2">
            {blocked ? null : <MessageButton handle={profile.handle} />}
            <BlockButton userId={profile.userId} name={profile.displayName} blocked={blocked} />
            <span className="inline-flex min-h-11 items-center px-2">
              <ReportButton targetType="profile" targetId={profile.userId} />
            </span>
          </div>
        )}
      </header>

      {viewerIsStaff && !isSelf && profile.avatarId ? (
        <div className="mt-6 rounded-lg border border-line px-4 py-3">
          <ImageUpload url={`/api/v1/staff/accounts/${profile.userId}/avatar`} mediaId={profile.avatarId} name={profile.displayName} label="Staff: remove this profile picture" removeOnly />
        </div>
      ) : null}

      {blocked ? (
        <p role="status" className="mt-6 rounded-lg bg-surface-sunken px-4 py-3 text-sm text-ink">
          You have blocked {profile.displayName}. Neither of you can message the other.
        </p>
      ) : null}

      <SectionHeading>About</SectionHeading>
      {profile.bio ? (
        <Prose text={profile.bio} />
      ) : (
        <p className="text-ink-muted">{isSelf ? 'You have not written anything about yourself yet.' : 'Nothing written here yet.'}</p>
      )}

      <SectionHeading>Characters</SectionHeading>
      {characters.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {characters.map((character) => (
            <li key={character.id}>
              <Link href={`/characters/${character.id}`} className={cardClass}>
                <h3 className="font-display text-lg font-semibold text-ink">{character.name}</h3>
                <p className="text-sm text-ink-muted">in {character.communityName}</p>
                {character.tagline ? <p className="mt-3 font-serif italic leading-relaxed text-ink">{character.tagline}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">
          {isSelf
            ? 'Characters you add to a community appear here. The ones in your library stay private.'
            : 'No characters in any community you can see.'}
        </p>
      )}

      <SectionHeading>Communities</SectionHeading>
      {communities.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {communities.map((community) => (
            <li key={community.slug} className="wr-accent-scope" style={{ '--wr-accent-hue': community.accentHue } as CSSProperties}>
              <Link
                href={`/c/${community.slug}`}
                className="inline-flex min-h-9 items-center rounded-full bg-accent-soft px-3 text-sm font-medium text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {community.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">{isSelf ? 'You have not joined a community yet.' : 'No communities you can see.'}</p>
      )}
    </>
  );
}
