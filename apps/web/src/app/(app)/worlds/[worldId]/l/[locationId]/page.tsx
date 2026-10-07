import { buttonClass } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs, Prose } from '@/features/shell/prose';
import { loadLibraryWorld } from '@/features/worlds/library-world';
import { ancestryOf, LocationTree } from '@/features/worlds/location-tree';

interface Props {
  params: Promise<{ worldId: string; locationId: string }>;
}

const loadLocation = async ({ params }: Props) => {
  const { worldId, locationId } = await params;
  const { world, locations } = await loadLibraryWorld(worldId);
  const ancestry = ancestryOf(locations, locationId);
  const location = ancestry.at(-1);
  if (!location) notFound();
  return { world, locations, ancestry, location };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: (await loadLocation(props)).location.name };
}

export default async function LibraryLocationPage(props: Props) {
  const { world, locations, ancestry, location } = await loadLocation(props);
  const base = `/worlds/${world.id}`;
  const hrefFor = (target: { id: string }) => `${base}/l/${target.id}`;
  const hasChildren = locations.some((other) => other.parentId === location.id);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Library', href: '/library' },
          { label: world.name, href: base },
          ...ancestry.slice(0, -1).map((parent) => ({ label: parent.name, href: hrefFor(parent) })),
          { label: location.name },
        ]}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">{location.name}</h1>
          {location.summary ? <p className="mt-2 max-w-2xl text-lg text-ink-muted">{location.summary}</p> : null}
        </div>
        <Link href={`${hrefFor(location)}/edit`} className={buttonClass('secondary')}>
          Edit location
        </Link>
      </div>

      {location.description ? <Prose text={location.description} className="mt-8" /> : null}

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-xl font-semibold text-ink">Inside {location.name}</h2>
        <Link href={`${base}/locations/new?parent=${location.id}`} className={buttonClass('secondary')}>
          Add location here
        </Link>
      </div>
      <div className="mt-4">
        {hasChildren ? (
          <div className="rounded-2xl border border-line bg-surface-raised px-1 py-3">
            <LocationTree locations={locations} parentId={location.id} hrefFor={hrefFor} />
          </div>
        ) : (
          <p className="text-ink-muted">Nothing inside this location yet.</p>
        )}
      </div>
    </>
  );
}
