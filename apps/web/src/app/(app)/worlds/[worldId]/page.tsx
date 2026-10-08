import { buttonClass } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs, Prose } from '@/features/shell/prose';
import { loadLibraryWorld } from '@/features/worlds/library-world';
import { LocationTree } from '@/features/worlds/location-tree';
import { WorldSharingPanel } from '@/features/worlds/world-sharing';

interface Props {
  params: Promise<{ worldId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await loadLibraryWorld((await params).worldId)).world.name };
}

export default async function LibraryWorldPage({ params }: Props) {
  const { world, locations } = await loadLibraryWorld((await params).worldId);
  const base = `/worlds/${world.id}`;

  return (
    <>
      <Breadcrumbs items={[{ label: 'Library', href: '/library' }, { label: world.name }]} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink md:text-4xl">{world.name}</h1>
          {world.summary ? <p className="mt-2 max-w-2xl text-lg text-ink-muted">{world.summary}</p> : null}
          <p className="mt-3 text-sm text-ink-muted">
            {world.sourceWorldId ? 'Your own copy of a world that was shared with you.' : 'An original in your library.'} Only you can change it.
          </p>
        </div>
        <Link href={`${base}/edit`} className={buttonClass('secondary')}>
          Edit world
        </Link>
      </div>

      {world.description ? <Prose text={world.description} className="mt-8" /> : null}

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-xl font-semibold text-ink">Locations</h2>
        <Link href={`${base}/locations/new`} className={buttonClass('secondary')}>
          Add location
        </Link>
      </div>
      <div className="mt-4">
        {locations.length > 0 ? (
          <LocationTree locations={locations} hrefFor={(location) => `${base}/l/${location.id}`} />
        ) : (
          <p className="text-ink-muted">No locations yet. A world needs at least one place before a scene can be set in it.</p>
        )}
      </div>

      <WorldSharingPanel worldId={world.id} shareCode={world.shareCode} />
    </>
  );
}
