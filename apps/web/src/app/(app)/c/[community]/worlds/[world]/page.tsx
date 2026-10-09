import { buttonClass } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/features/shell/prose';
import { RichText } from '@/features/shell/rich-text';
import { loadCommunityWorld } from '@/features/worlds/community-world';
import { LocationTree } from '@/features/worlds/location-tree';

interface Props {
  params: Promise<{ community: string; world: string }>;
}

const loadWorld = async ({ params }: Props) => {
  const { community, world } = await params;
  return loadCommunityWorld(community, world);
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: (await loadWorld(props)).world.name };
}

export default async function WorldPage(props: Props) {
  const { community, world, locations, powers, base } = await loadWorld(props);

  return (
    <>
      <Breadcrumbs items={[{ label: 'Worlds', href: `/c/${community.slug}/worlds` }, { label: world.name }]} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">{world.name}</h2>
          {world.summary ? <p className="mt-2 max-w-2xl text-lg text-ink-muted">{world.summary}</p> : null}
          {world.copiedAt ? (
            <p className="mt-3 text-sm text-ink-muted">
              This is the community&apos;s own copy, added on {world.copiedAt.toLocaleDateString('en', { dateStyle: 'long' })}.
              {powers.editWorld ? ' Editing it changes it for the community only.' : ''}
            </p>
          ) : null}
        </div>
        {/* Shown to the community staff who hold "Manage worlds". */}
        {powers.editWorld ? (
          <Link href={`${base}/edit`} className={buttonClass('secondary')}>
            Edit world
          </Link>
        ) : null}
      </div>

      {world.description ? <RichText docs={world.docs} field="description" text={world.description} className="mt-8" /> : null}

      <div className="mb-4 mt-12 flex flex-wrap items-center justify-between gap-4">
        <h3 className="font-display text-xl font-semibold text-ink">Locations</h3>
        {powers.addLocations ? (
          <Link href={`${base}/locations/new`} className={buttonClass('secondary')}>
            Add location
          </Link>
        ) : null}
      </div>
      {locations.length > 0 ? (
        <LocationTree locations={locations} hrefFor={(location) => `${base}/l/${location.id}`} />
      ) : (
        <p className="text-ink-muted">No locations yet.{powers.addLocations ? ' A world needs at least one place before a scene can be set in it.' : ''}</p>
      )}
    </>
  );
}
