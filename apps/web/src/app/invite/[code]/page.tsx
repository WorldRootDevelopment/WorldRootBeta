import { DomainError, getInvitePreview } from '@worldroot/core';
import { buttonClass, Wordmark } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { CSSProperties } from 'react';
import { AcceptInviteButton } from '@/features/community/accept-invite-button';
import { database } from '@/lib/server';
import { getViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'You Are Invited' };

/**
 * Where an invite link lands. A visitor who is signed out, or has not finished
 * onboarding, is sent to do that first and brought straight back here.
 */
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const here = `/invite/${encodeURIComponent(code)}`;
  const viewer = await getViewer();
  if (!viewer) redirect(`/sign-up?next=${encodeURIComponent(here)}`);
  if (!viewer.profile) redirect(`/welcome?next=${encodeURIComponent(here)}`);

  const { db } = await database();
  const preview = await getInvitePreview(db, viewer.actor, code).catch((error: unknown) => {
    if (error instanceof DomainError && error.code === 'not_found') return null;
    throw error;
  });

  const { community } = preview ?? {};

  return (
    <main
      className="wr-accent-scope mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12"
      style={community ? ({ '--wr-accent-hue': community.accentHue } as CSSProperties) : undefined}
    >
      <Link href="/home" className="mb-8 self-start rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
        <Wordmark />
      </Link>

      {!preview || !community ? (
        <>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">This Invite Is Not Valid</h1>
          <p className="mt-2 text-ink-muted">The link may have been mistyped or withdrawn. Ask whoever sent it for a new one.</p>
          <Link href="/home" className={`${buttonClass('secondary', 'lg')} mt-8 self-start`}>
            Go to Home
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-accent-text">You are invited to join</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink">{community.name}</h1>
          {community.tagline ? <p className="mt-2 text-lg text-ink-muted">{community.tagline}</p> : null}
          <p className="mt-4 text-sm text-ink-muted">
            {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
          </p>
          <div className="mt-8">
            {preview.alreadyMember ? (
              <Link href={`/c/${community.slug}`} className={buttonClass('primary', 'lg')}>
                You are a member. Open {community.name}
              </Link>
            ) : preview.usable ? (
              <AcceptInviteButton code={code} communityName={community.name} />
            ) : (
              <p className="rounded-lg bg-surface-sunken px-4 py-3 text-sm text-ink">This invite link no longer works. Ask for a new one.</p>
            )}
          </div>
        </>
      )}
    </main>
  );
}
