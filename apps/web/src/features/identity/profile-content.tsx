import 'server-only';
import { friendState, getProfileView, hasBlocked, listAchievements } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import { Globe } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { cache } from 'react';
import { FriendButton } from '@/features/friends/friend-client';
import { ImageUpload } from '@/features/media/image-upload';
import { ReportButton } from '@/features/moderation/report-client';
import { Picture } from '@/features/shell/picture';
import { cardClass, Prose, SectionHeading } from '@/features/shell/prose';
import { load } from '@/lib/load';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';
import { BlockButton } from './account-client';
import { Achievements } from './achievements';
import { Badges } from './badges';
import { MessageButton } from './profile-client';

/** Everything one viewer may see of one person's profile. Loaded once per request, however many places use it. */
export const loadProfile = cache(async (handle: string) => {
  const viewer = await requireViewer();
  const { db } = await database();
  const view = await load(() => getProfileView(db, viewer.actor, decodeURIComponent(handle)));
  const [blocked, friendship, achievements] = await Promise.all([
    view.isSelf ? false : hasBlocked(db, viewer.actor, view.profile.userId),
    view.isSelf ? ('none' as const) : friendState(db, viewer.actor.userId, view.profile.userId),
    listAchievements(db, view.profile.userId),
  ]);
  return { ...view, viewerIsStaff: viewer.actor.platformRole === 'staff', blocked, friendship, achievements };
});

interface ProfileContentProps {
  handle: string;
  /** Shown in the pop-up that opens over the page: more compact, with a link to the full page. */
  popup?: boolean;
}

/**
 * A person's profile. The same content serves the full page at /u/handle and
 * the pop-up that opens when a name is clicked.
 */
export async function ProfileContent({ handle, popup = false }: ProfileContentProps) {
  const { profile, isSelf, joinedAt, communities, characters, blocked, viewerIsStaff, friendship, achievements } = await loadProfile(handle);
  const Name = popup ? 'h2' : 'h1';
  const columns = popup ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3';
  // Their own background, if they chose one. It fills the pop-up, or the card at the top of the full page.
  const themed = profile.theme !== null;
  const look = {
    ...(profile.accentHue === null ? {} : { '--wr-accent-hue': profile.accentHue }),
    ...(profile.theme ? { '--wr-pt-from': profile.theme.from, '--wr-pt-to': profile.theme.to, '--wr-pt-angle': profile.theme.angle } : {}),
  } as CSSProperties;
  const scope = [profile.accentHue === null ? '' : 'wr-accent-scope', themed && popup ? 'wr-profile-theme rounded-3xl' : ''].filter(Boolean).join(' ');

  return (
    <div className={scope || undefined} style={look}>
      <header className={popup ? 'overflow-hidden' : `${themed ? 'wr-profile-theme' : 'wr-glass'} overflow-hidden rounded-3xl`}>
        {/* The banner: their own picture, shown in the same 4 to 1 shape it was cut to when uploaded, or a wash of color. */}
        {profile.bannerId ? (
          <img src={`/api/v1/media/${profile.bannerId}`} alt="" className="aspect-[4/1] w-full object-cover" />
        ) : themed ? (
          <div aria-hidden="true" className={`wr-profile-theme-band w-full ${popup ? 'h-24' : 'h-28 md:h-36'}`} />
        ) : (
          <div
            aria-hidden="true"
            className={`w-full bg-linear-to-br from-accent-soft via-accent-light to-accent ${popup ? 'h-24' : 'h-28 md:h-36'}`}
            style={{ '--tw-gradient-via': 'var(--wr-accent-light)' } as CSSProperties}
          />
        )}
        <div className={`flex flex-wrap items-end gap-x-5 gap-y-4 px-5 pb-5 ${popup ? '' : 'md:px-8'}`}>
          <div className="relative shrink-0 self-start">
            <Picture
              mediaId={profile.avatarId}
              name={profile.displayName}
              className={popup ? '-mt-10 size-20 text-3xl ring-4 ring-surface-raised' : '-mt-10 size-24 text-4xl ring-4 ring-surface-raised md:-mt-12 md:size-28'}
            />
            {/* Their own website: the one link here that can point anywhere, so its address is in the label and nothing of ours goes with the visit. */}
            {profile.website ? (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                title={`Their Website: ${new URL(profile.website).hostname}`}
                className="wr-gloss absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full ring-2 ring-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <Globe className="size-4" aria-hidden="true" />
                <span className="sr-only">
                  {profile.displayName}’s Website, {new URL(profile.website).hostname}. Opens In A New Tab.
                </span>
              </a>
            ) : null}
          </div>
          {/* The name keeps a sensible width; anything that does not fit beside it moves to the next row instead of squeezing it. */}
          <div className="min-w-56 flex-1 pt-3">
            <Name id={popup ? 'profile-popup-name' : undefined} className={`flex flex-wrap items-center gap-x-3 gap-y-1 break-words font-display font-bold tracking-tight text-ink ${popup ? 'text-2xl' : 'text-3xl md:text-4xl'}`}>
              {profile.displayName}
              <Badges list={profile.badges} all />
            </Name>
            <p className="mt-1 text-ink-muted">
              @{profile.handle}
              {profile.pronouns ? <span> · {profile.pronouns}</span> : null}
              <span> · Joined {joinedAt.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
            </p>
            {profile.status ? <p className="mt-2 inline-flex max-w-full rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-text">{profile.status}</p> : null}
            {profile.links.length > 0 ? (
              <ul aria-label="Elsewhere" className="mt-3 flex flex-wrap gap-2">
                {profile.links.map((link) => (
                  <li key={link.service}>
                    {link.url ? (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow ugc"
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface-raised px-3 text-sm text-ink hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        <span className="font-medium">{link.label}</span>
                        <span className="text-ink-muted">{link.handle}</span>
                      </a>
                    ) : (
                      <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface-raised px-3 text-sm text-ink">
                        <span className="font-medium">{link.label}</span>
                        <span className="select-all text-ink-muted">{link.handle}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {isSelf ? (
            <Link href="/settings/profile" className={buttonClass('secondary')}>
              Edit Profile
            </Link>
          ) : (
            <div className={`flex flex-wrap items-center gap-2 ${popup ? 'basis-full' : 'basis-full xl:basis-auto'}`}>
              {blocked ? null : <MessageButton handle={profile.handle} />}
              {blocked ? null : <FriendButton userId={profile.userId} handle={profile.handle} state={friendship} />}
              <BlockButton userId={profile.userId} name={profile.displayName} blocked={blocked} />
              <span className="inline-flex min-h-11 items-center px-2">
                <ReportButton targetType="profile" targetId={profile.userId} />
              </span>
            </div>
          )}
        </div>
      </header>

      <div className={popup ? 'px-5 pb-6 pt-2' : 'mt-10'}>
        {/* Removing someone's pictures is done from the full page or the staff portal, not the pop-up. */}
        {!popup && viewerIsStaff && !isSelf && profile.bannerId ? (
          <div className="mt-6 rounded-lg border border-line px-4 py-3">
            <ImageUpload url={`/api/v1/staff/accounts/${profile.userId}/banner`} mediaId={profile.bannerId} name={profile.displayName} label="Rootwarden: Remove This Banner" shape="banner" removeOnly />
          </div>
        ) : null}
        {!popup && viewerIsStaff && !isSelf && profile.avatarId ? (
          <div className="mt-6 rounded-lg border border-line px-4 py-3">
            <ImageUpload url={`/api/v1/staff/accounts/${profile.userId}/avatar`} mediaId={profile.avatarId} name={profile.displayName} label="Rootwarden: Remove This Profile Picture" removeOnly />
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

        <SectionHeading>Achievements</SectionHeading>
        <Achievements earned={achievements} compact={popup} />
        {isSelf ? (
          <p className="mt-3 text-sm">
            <Link href="/settings/achievements" className="font-medium text-accent-text underline">
              See All Achievements And Your Progress
            </Link>
          </p>
        ) : null}

        <SectionHeading>Characters</SectionHeading>
        {characters.length > 0 ? (
          <ul className={columns}>
            {characters.map((character) => (
              <li key={character.id}>
                <Link href={`/characters/${character.id}`} className={cardClass}>
                  <h3 className="font-display text-lg font-semibold text-ink">{character.name}</h3>
                  <p className="text-sm text-ink-muted">In {character.communityName}</p>
                  {character.tagline ? <p className="mt-3 font-serif italic leading-relaxed text-ink">{character.tagline}</p> : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">
            {isSelf ? 'Characters you add to a community appear here. The ones in your library stay private.' : 'No characters in any community you can see.'}
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

        {/* For Rootwardens (WorldRoot staff), at the foot of the profile, out of the way of what everyone else sees. */}
        {viewerIsStaff ? (
          <p className="mt-12 border-t border-line pt-6">
            <Link href={`/staff/accounts/${profile.userId}`} className={buttonClass('secondary')}>
              Rootwarden: Manage This Account
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
