import { listLibraryCharacters, listLibraryWorlds } from '@worldroot/core';
import { buttonClass, EmptyState } from '@worldroot/ui';
import { Library as LibraryIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CharacterCard } from '@/features/characters/character-card';
import { PageHeader } from '@/features/shell/page-header';
import { SectionHeading } from '@/features/shell/prose';
import { WorldCard } from '@/features/worlds/world-card';
import { ImportWorldForm } from '@/features/worlds/world-sharing';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Library' };

interface Props {
  searchParams: Promise<{ q?: string; tag?: string }>;
}

const chip =
  'inline-flex min-h-9 items-center rounded-full border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export default async function LibraryPage({ searchParams }: Props) {
  const { q = '', tag = '' } = await searchParams;
  const viewer = await requireViewer();
  const { db } = await database();
  const [characters, worlds] = await Promise.all([
    listLibraryCharacters(db, viewer.actor.userId),
    listLibraryWorlds(db, viewer.actor.userId),
  ]);

  // Searching and sorting happen here: a library is one person's, small enough to filter whole.
  const query = q.trim().toLowerCase();
  const allTags = [...new Set(characters.flatMap((character) => character.tags))].sort((a, b) => a.localeCompare(b));
  const shown = characters.filter(
    (character) =>
      (!tag || character.tags.some((other) => other.toLowerCase() === tag.toLowerCase())) &&
      (!query || [character.name, character.tagline, character.species, ...character.tags].some((text) => text?.toLowerCase().includes(query))),
  );
  const filterHref = (next: { q?: string; tag?: string }) => {
    const params = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextTag = next.tag ?? tag;
    if (nextQ) params.set('q', nextQ);
    if (nextTag) params.set('tag', nextTag);
    const text = params.toString();
    return text ? `/library?${text}` : '/library';
  };

  return (
    <>
      <PageHeader title="Library" lead="Your own characters and worlds, independent of any community." />

      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/library/characters/new" className={buttonClass('primary')}>
          New Character
        </Link>
        <Link href="/library/worlds/new" className={buttonClass('secondary')}>
          New World
        </Link>
        <Link href="/library/worlds/templates" className={buttonClass('secondary')}>
          World Templates
        </Link>
        <Link href="/stories" className={buttonClass('secondary')}>
          Your Stories
        </Link>
      </div>
      <div className="mb-10">
        <ImportWorldForm />
      </div>

      {characters.length === 0 && worlds.length === 0 ? (
        <EmptyState icon={<LibraryIcon className="size-8" aria-hidden="true" />} title="Your Library Is Empty">
          Characters and worlds you make live here, independent of any community. Start with a character: all it needs is a name.
        </EmptyState>
      ) : (
        <>
          <SectionHeading>Characters</SectionHeading>
          {characters.length > 0 ? (
            <>
              <form action="/library" role="search" className="mb-4 flex flex-wrap gap-2">
                {tag ? <input type="hidden" name="tag" value={tag} /> : null}
                <label htmlFor="library-search" className="sr-only">
                  Search Your Characters
                </label>
                <input
                  id="library-search"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Search By Name, Species Or Tag"
                  className="min-h-11 w-full max-w-sm rounded-lg border border-line-strong bg-surface-raised px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
                />
                <button type="submit" className={buttonClass('secondary')}>
                  Search
                </button>
              </form>
              {allTags.length > 0 ? (
                <nav aria-label="Filter By Tag" className="mb-5 flex flex-wrap gap-2">
                  <Link href={filterHref({ tag: '' })} aria-current={tag ? undefined : 'page'} className={`${chip} ${tag ? 'border-line-strong text-ink hover:bg-surface-sunken' : 'border-accent bg-accent-soft font-medium text-accent-text'}`}>
                    All
                  </Link>
                  {allTags.map((name) => {
                    const on = name.toLowerCase() === tag.toLowerCase();
                    return (
                      <Link key={name} href={filterHref({ tag: on ? '' : name })} aria-current={on ? 'page' : undefined} className={`${chip} ${on ? 'border-accent bg-accent-soft font-medium text-accent-text' : 'border-line-strong text-ink hover:bg-surface-sunken'}`}>
                        {name}
                      </Link>
                    );
                  })}
                </nav>
              ) : null}
              {shown.length > 0 ? (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {shown.map((character) => (
                    <li key={character.id}>
                      <CharacterCard character={character} note="Original" tags={character.tags} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p role="status" className="text-ink-muted">
                  No characters match.{' '}
                  <Link href="/library" className="font-medium text-accent-text underline">
                    Show All
                  </Link>
                </p>
              )}
            </>
          ) : (
            <p className="text-ink-muted">No characters yet.</p>
          )}

          <SectionHeading>Worlds</SectionHeading>
          {worlds.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {worlds.map((world) => (
                <li key={world.id}>
                  <WorldCard world={world} href={`/worlds/${world.id}`} note={world.sourceWorldId ? 'Your Copy Of A Shared World' : world.shareCode ? 'Original · Shared By ID' : 'Original'} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-muted">No worlds yet.</p>
          )}
        </>
      )}
    </>
  );
}
