import { listCommunityWorlds, listRoles } from '@worldroot/core';
import { loadCommunity } from '@/features/community/community-view';
import { Prose, SectionHeading } from '@/features/shell/prose';
import { WorldCard } from '@/features/worlds/world-card';

export default async function CommunityHomePage({ params }: { params: Promise<{ community: string }> }) {
  const { community, db } = await loadCommunity((await params).community);
  const [worlds, roles] = await Promise.all([listCommunityWorlds(db, community.id), listRoles(db, community.id)]);

  return (
    <>
      {community.description ? (
        <>
          <SectionHeading>About</SectionHeading>
          <Prose text={community.description} />
        </>
      ) : null}

      <SectionHeading>Worlds</SectionHeading>
      {worlds.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {worlds.map((world) => (
            <li key={world.id}>
              <WorldCard world={world} href={`/c/${community.slug}/worlds/${world.slug}`} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">This community has not added a world yet.</p>
      )}

      {community.rules ? (
        <>
          <SectionHeading>Rules</SectionHeading>
          <Prose text={community.rules} />
        </>
      ) : null}

      <SectionHeading>Roles</SectionHeading>
      <ul className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <li key={role.id} className="rounded-full border border-line bg-surface-raised px-3 py-1.5 text-sm text-ink">
            {role.name}
          </li>
        ))}
      </ul>
    </>
  );
}
