import { getCharacterView } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { cache } from 'react';
import { CharacterAvatar } from '@/features/characters/character-card';
import { ReportButton } from '@/features/moderation/report-client';
import { Breadcrumbs, SectionHeading } from '@/features/shell/prose';
import { RichText } from '@/features/shell/rich-text';
import { load } from '@/lib/load';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

interface Props {
  params: Promise<{ characterId: string }>;
}

const loadCharacter = cache(async (characterId: string) => {
  const viewer = await requireViewer();
  const { db } = await database();
  return load(() => getCharacterView(db, viewer.actor, characterId));
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await loadCharacter((await params).characterId)).character.name };
}

export default async function CharacterPage({ params }: Props) {
  const { character, community, customFields, sourceName, canEdit } = await loadCharacter((await params).characterId);

  const facts = [
    { label: 'Pronouns', value: character.pronouns },
    { label: 'Species', value: character.species },
    { label: 'Age', value: character.age },
    { label: 'Gender', value: character.gender },
    ...customFields,
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value));

  const sections = [
    { title: 'Appearance', field: 'appearance', text: character.appearance },
    { title: 'Personality', field: 'personality', text: character.personality },
    { title: 'Biography', field: 'biography', text: character.biography },
    { title: 'Skills and abilities', field: 'skills', text: character.skills },
    { title: 'Likes', field: 'likes', text: character.likes },
    { title: 'Dislikes', field: 'dislikes', text: character.dislikes },
    { title: 'Voice', field: 'voice', text: character.voice },
    { title: 'Content and boundaries', field: 'boundaries', text: character.boundaries },
  ].filter((section): section is { title: string; field: string; text: string } => Boolean(section.text));

  return (
    <div
      className={community ? 'wr-accent-scope' : undefined}
      style={community ? ({ '--wr-accent-hue': community.accentHue } as CSSProperties) : undefined}
    >
      <Breadcrumbs
        items={
          community
            ? [
                { label: community.name, href: `/c/${community.slug}` },
                { label: 'Characters', href: `/c/${community.slug}/characters` },
                { label: character.name },
              ]
            : [{ label: 'Library', href: '/library' }, { label: character.name }]
        }
      />

      <header className="flex flex-wrap items-start gap-5">
        <CharacterAvatar name={character.name} mediaId={character.portraitMediaId} className="size-20 text-3xl" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">{character.name}</h1>
          {character.tagline ? <p className="mt-2 font-serif text-lg italic text-ink-muted">{character.tagline}</p> : null}
          <p className="mt-3 text-sm text-ink-muted">
            {community
              ? sourceName
                ? `${community.name}'s copy of your character ${sourceName}. Changes here do not reach your library.`
                : `A character in ${community.name}.`
              : 'An original in your library.'}
          </p>
        </div>
        {canEdit ? (
          <Link href={`/characters/${character.id}/edit`} className={buttonClass('secondary')}>
            Edit
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center px-2">
            <ReportButton targetType="character" targetId={character.id} />
          </span>
        )}
      </header>

      {character.approvalStatus === 'pending' || character.approvalStatus === 'returned' ? (
        <p role="status" className="mt-6 rounded-lg bg-surface-sunken px-4 py-3 text-sm text-ink">
          {character.approvalStatus === 'pending'
            ? 'Waiting for review. This character can join scenes once the community approves it.'
            : 'Returned by a reviewer. Revise the profile, then ask the community staff to look again.'}
        </p>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[16rem_1fr]">
        {facts.length > 0 ? (
          <dl className="h-fit space-y-4 wr-glass rounded-2xl p-5">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">{fact.label}</dt>
                <dd className="mt-0.5 text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="min-w-0">
          {sections.length > 0 ? (
            sections.map((section) => (
              <section key={section.title}>
                <SectionHeading>{section.title}</SectionHeading>
                <RichText docs={character.docs} field={section.field} text={section.text} />
              </section>
            ))
          ) : (
            <p className="text-ink-muted">Nothing has been written about this character yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
