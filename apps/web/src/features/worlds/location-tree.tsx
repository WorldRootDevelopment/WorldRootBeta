import type { Location } from '@worldroot/core';
import Link from 'next/link';

/** Children of a parent, in their stored order. Pass null for the top level. */
export const childrenOf = (locations: Location[], parentId: string | null) =>
  locations.filter((location) => location.parentId === parentId);

/** The chain from the top of the tree down to a location, the location last. */
export function ancestryOf(locations: Location[], locationId: string): Location[] {
  const byId = new Map(locations.map((location) => [location.id, location]));
  const chain: Location[] = [];
  for (let at = byId.get(locationId); at; at = at.parentId ? byId.get(at.parentId) : undefined) chain.unshift(at);
  return chain;
}

interface LocationTreeProps {
  locations: Location[];
  parentId?: string | null;
  /** Builds the link for a location. */
  hrefFor: (location: Location) => string;
}

/** A nested list of locations. Each level is indented under its parent. */
export function LocationTree({ locations, parentId = null, hrefFor }: LocationTreeProps) {
  const level = childrenOf(locations, parentId);
  if (level.length === 0) return null;

  return (
    <ul className={parentId ? 'ml-4 mt-1 border-l border-line pl-4' : 'space-y-3'}>
      {level.map((location) => (
        <li key={location.id} className={parentId ? 'py-1.5' : 'wr-glass rounded-2xl p-5'}>
          <Link
            href={hrefFor(location)}
            className="rounded font-medium text-ink hover:text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {location.name}
          </Link>
          {location.summary ? <p className="mt-0.5 text-sm text-ink-muted">{location.summary}</p> : null}
          <LocationTree locations={locations} parentId={location.id} hrefFor={hrefFor} />
        </li>
      ))}
    </ul>
  );
}
