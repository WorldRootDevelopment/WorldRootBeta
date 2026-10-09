import type { Character } from '@worldroot/core';
import Link from 'next/link';
import { Picture } from '@/features/shell/picture';
import { cardClass } from '@/features/shell/prose';

interface CharacterCardProps {
  character: Character;
  /** Short facts shown as chips, such as rank and position. */
  facts?: string[];
  note?: string;
}

export function CharacterAvatar({ name, mediaId = null, className = 'size-12 text-lg' }: { name: string; mediaId?: string | null; className?: string }) {
  return <Picture mediaId={mediaId} name={name} className={className} />;
}

export function CharacterCard({ character, facts = [], note }: CharacterCardProps) {
  return (
    <Link href={`/characters/${character.id}`} className={cardClass}>
      <div className="flex items-start gap-4">
        <CharacterAvatar name={character.name} mediaId={character.portraitMediaId} />
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-ink">{character.name}</h3>
          {character.species ? <p className="text-sm text-ink-muted">{character.species}</p> : null}
        </div>
      </div>
      {character.tagline ? <p className="mt-4 font-serif italic leading-relaxed text-ink">{character.tagline}</p> : null}
      {facts.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {facts.map((fact, index) => (
            // Two fields can hold the same value, so the value alone is not a unique key.
            <li key={index} className="rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-ink-muted">
              {fact}
            </li>
          ))}
        </ul>
      ) : null}
      {note ? <p className="mt-3 text-xs text-ink-muted">{note}</p> : null}
    </Link>
  );
}
