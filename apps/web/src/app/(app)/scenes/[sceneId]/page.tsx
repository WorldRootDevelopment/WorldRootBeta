import { getSceneView, listPosts } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { cache } from 'react';
import { Badges } from '@/features/identity/badges';
import { RatingBadge, StatusBadge } from '@/features/scenes/badges';
import { Composer } from '@/features/scenes/composer';
import { DiceRoller } from '@/features/scenes/dice-roller';
import { OocMessage, StoryPost } from '@/features/scenes/post';
import { InviteForm, JoinForm, OocForm, SceneLive, StatusControl } from '@/features/scenes/scene-actions';
import { Breadcrumbs } from '@/features/shell/prose';
import { load } from '@/lib/load';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

interface Props {
  params: Promise<{ sceneId: string }>;
  searchParams: Promise<{ before?: string }>;
}

const loadScene = cache(async (sceneId: string) => {
  const viewer = await requireViewer();
  const { db } = await database();
  const view = await load(() => getSceneView(db, viewer.actor, sceneId));
  return { view, viewer, db };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await loadScene((await params).sceneId)).view.scene.title };
}

const panelClass = 'rounded-2xl border border-line bg-surface-raised p-5';
const panelTitle = 'mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted';

export default async function ScenePage({ params, searchParams }: Props) {
  const { sceneId } = await params;
  const before = Number((await searchParams).before) || undefined;
  const { view, viewer, db } = await loadScene(sceneId);
  const { scene, place, participants, cast, viewer: me } = view;

  const [story, ooc] = await Promise.all([
    listPosts(db, viewer.actor, sceneId, { stream: 'story', beforeSeq: before }),
    listPosts(db, viewer.actor, sceneId, { stream: 'ooc', limit: 30 }),
  ]);

  const closed = scene.status === 'completed' || scene.status === 'archived';
  const locationHref = place?.world && place.location ? `/c/${place.community.slug}/worlds/${place.world.slug}/l/${place.location.id}` : null;
  const needsCommunityCharacter = Boolean(place) && !closed && !me.isParticipant && me.canBring.length === 0;

  return (
    <div className={place ? 'wr-accent-scope' : undefined} style={place ? ({ '--wr-accent-hue': place.community.accentHue } as CSSProperties) : undefined}>
      <SceneLive sceneId={scene.id} lastSeq={scene.lastSeq} track={me.isParticipant && !before} />

      <Breadcrumbs
        items={
          place
            ? [
                { label: place.community.name, href: `/c/${place.community.slug}` },
                ...(place.world ? [{ label: place.world.name, href: `/c/${place.community.slug}/worlds/${place.world.slug}` }] : []),
                ...(place.location && locationHref ? [{ label: place.location.name, href: locationHref }] : []),
                { label: scene.title },
              ]
            : [{ label: 'Scenes', href: '/scenes' }, { label: scene.title }]
        }
      />

      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={scene.status} />
          <RatingBadge rating={scene.rating} />
          {place ? null : <span className="text-xs font-medium text-ink-muted">Private scene</span>}
        </div>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">{scene.title}</h1>
        {scene.description ? <p className="mt-3 max-w-[68ch] text-ink-muted">{scene.description}</p> : null}
      </header>

      <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          {story.hasEarlier && story.posts[0] ? (
            <p className="mb-10">
              <Link href={`/scenes/${scene.id}?before=${story.posts[0].seq}`} className={buttonClass('secondary')}>
                Read earlier posts
              </Link>
            </p>
          ) : null}

          <div className="space-y-12">
            {story.posts.map((post) => (
              <StoryPost key={post.id} post={post} canModerate={story.viewerCanModerate} editable={scene.status !== 'archived'} />
            ))}
          </div>

          {before ? (
            <p className="mt-12">
              <Link href={`/scenes/${scene.id}`} className={buttonClass('secondary')}>
                Jump to the latest posts
              </Link>
            </p>
          ) : (
            <div className="mt-12 border-t border-line pt-8">
              {me.canPost ? (
                <>
                  <Composer sceneId={scene.id} characters={me.characters} draft={me.draft} />
                  {view.dice ? <DiceRoller sceneId={scene.id} characters={me.characters} /> : null}
                </>
              ) : closed ? (
                <p className="text-ink-muted">
                  This scene is {scene.status === 'completed' ? 'complete' : 'archived'}. It stays here to be read.
                </p>
              ) : me.canBring.length > 0 ? (
                <JoinForm sceneId={scene.id} characters={me.canBring} joined={false} />
              ) : needsCommunityCharacter ? (
                <div>
                  <p className="text-ink-muted">To write here, add one of your characters to {place!.community.name} first.</p>
                  <Link href={`/c/${place!.community.slug}/characters/add`} className={`${buttonClass('primary')} mt-4`}>
                    Add a character
                  </Link>
                </div>
              ) : (
                <p className="text-ink-muted">You are reading this scene.</p>
              )}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <section className="rounded-2xl bg-ooc p-5" aria-label="Out of character">
            <h2 className={panelTitle}>Out of character</h2>
            {ooc.posts.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {ooc.posts.map((post) => (
                  <OocMessage key={post.id} post={post} canModerate={ooc.viewerCanModerate} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">Nothing out of character yet. Use this for planning and quick notes, so the story stays clean.</p>
            )}
            {me.isParticipant && scene.status !== 'archived' ? <OocForm sceneId={scene.id} /> : null}
          </section>

          <section className={panelClass}>
            <h2 className={panelTitle}>Characters</h2>
            <ul className="flex flex-col gap-2">
              {cast.map((character) => (
                <li key={character.id}>
                  <Link
                    href={`/characters/${character.id}`}
                    className="rounded font-serif text-base text-ink hover:text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    {character.name}
                  </Link>
                </li>
              ))}
            </ul>
            {me.isParticipant && me.canBring.length > 0 ? (
              <div className="mt-5 border-t border-line pt-4">
                <JoinForm sceneId={scene.id} characters={me.canBring} joined />
              </div>
            ) : null}
          </section>

          <section className={panelClass}>
            <h2 className={panelTitle}>Writers</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {participants.map((person) => (
                <li key={person.userId} className="text-ink">
                  <Link href={`/u/${person.handle}`} className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                    {person.displayName}
                  </Link>{' '}
                  <span className="text-ink-muted">@{person.handle}</span> <Badges list={person.badges} compact />
                </li>
              ))}
            </ul>
            {!place && me.isParticipant && !closed ? (
              <div className="mt-5 border-t border-line pt-4">
                <InviteForm sceneId={scene.id} />
              </div>
            ) : null}
          </section>

          {me.canManage ? (
            <section className={panelClass}>
              <StatusControl sceneId={scene.id} status={scene.status} />
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
