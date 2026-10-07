import { locations, worlds, type Db } from '@worldroot/db';
import { and, asc, eq } from 'drizzle-orm';
import { assertSlug, communityGrants } from '../community/service';
import { recordAudit } from '../platform/audit';
import { authorize, authorizeOwner, type Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { emitEvent } from '../platform/outbox';

export type World = typeof worlds.$inferSelect;
export type Location = typeof locations.$inferSelect;

const MAX_LOCATION_DEPTH = 5;

export interface CreateWorldInput {
  slug: string;
  name: string;
  summary?: string;
  description?: string;
}

/** Creates a world in the actor's own library. */
export async function createWorld(db: Db, actor: Actor, input: CreateWorldInput): Promise<World> {
  assertSlug(input.slug);
  const [taken] = await db
    .select({ id: worlds.id })
    .from(worlds)
    .where(and(eq(worlds.ownerUserId, actor.userId), eq(worlds.slug, input.slug)));
  if (taken) throw new DomainError('conflict', 'You already have a world at that address.');
  const [world] = await db
    .insert(worlds)
    .values({ ...input, ownerUserId: actor.userId })
    .returning();
  return world!;
}

async function requireWorld(db: Db, worldId: string): Promise<World> {
  const [world] = await db.select().from(worlds).where(eq(worlds.id, worldId));
  if (!world) throw new DomainError('not_found', 'That world does not exist.');
  return world;
}

export interface CreateLocationInput {
  name: string;
  parentId?: string | null;
  summary?: string;
  description?: string;
  position?: number;
}

/** Adds a location to a world. Only the name is required. */
export async function createLocation(db: Db, actor: Actor, worldId: string, input: CreateLocationInput): Promise<Location> {
  const world = await requireWorld(db, worldId);
  if (world.ownerUserId) authorizeOwner(actor, world.ownerUserId);
  else await authorize(actor, 'location.create', { communityId: world.ownerCommunityId!, worldId }, communityGrants(db));

  if (input.parentId) {
    const all = await listLocations(db, worldId);
    const byId = new Map(all.map((location) => [location.id, location]));
    let depth = 1;
    for (let at = byId.get(input.parentId); at; at = at.parentId ? byId.get(at.parentId) : undefined) depth += 1;
    if (!byId.has(input.parentId)) throw new DomainError('invalid_input', 'The parent location is not in this world.');
    if (depth > MAX_LOCATION_DEPTH) {
      throw new DomainError('invalid_input', `Locations can nest ${MAX_LOCATION_DEPTH} levels deep at most.`);
    }
  }

  const [location] = await db
    .insert(locations)
    .values({ ...input, worldId })
    .returning();
  return location!;
}

export async function listLocations(db: Db, worldId: string): Promise<Location[]> {
  return db
    .select()
    .from(locations)
    .where(eq(locations.worldId, worldId))
    .orderBy(asc(locations.position), asc(locations.id));
}

export async function listLibraryWorlds(db: Db, userId: string): Promise<World[]> {
  return db.select().from(worlds).where(eq(worlds.ownerUserId, userId)).orderBy(asc(worlds.name));
}

export async function listCommunityWorlds(db: Db, communityId: string): Promise<World[]> {
  return db.select().from(worlds).where(eq(worlds.ownerCommunityId, communityId)).orderBy(asc(worlds.name));
}

export async function getCommunityWorld(db: Db, communityId: string, slug: string): Promise<World> {
  const [world] = await db
    .select()
    .from(worlds)
    .where(and(eq(worlds.ownerCommunityId, communityId), eq(worlds.slug, slug)));
  if (!world) throw new DomainError('not_found', 'That world does not exist.');
  return world;
}

/**
 * Gives a community its own copy of a library world, with its whole location tree.
 * The copy remembers its source and is otherwise independent: later edits on
 * either side never reach the other.
 */
export async function copyWorldToCommunity(db: Db, actor: Actor, worldId: string, communityId: string): Promise<World> {
  const source = await requireWorld(db, worldId);
  if (!source.ownerUserId) throw new DomainError('invalid_input', 'Only a library world can be added to a community.');
  authorizeOwner(actor, source.ownerUserId);
  await authorize(actor, 'world.add', { communityId }, communityGrants(db));

  return db.transaction(async (tx) => {
    const [taken] = await tx
      .select({ id: worlds.id })
      .from(worlds)
      .where(and(eq(worlds.ownerCommunityId, communityId), eq(worlds.slug, source.slug)));
    if (taken) throw new DomainError('conflict', 'This community already has a world at that address.');

    const [copy] = await tx
      .insert(worlds)
      .values({
        ownerCommunityId: communityId,
        sourceWorldId: source.id,
        copiedAt: new Date(),
        slug: source.slug,
        name: source.name,
        summary: source.summary,
        description: source.description,
      })
      .returning();

    // Parents are inserted before children so each copy can point at its new parent.
    const originals = await listLocations(tx, source.id);
    const newIds = new Map<string, string>();
    let pending = originals;
    while (pending.length > 0) {
      const ready = pending.filter((location) => !location.parentId || newIds.has(location.parentId));
      if (ready.length === 0) break;
      const inserted = await tx
        .insert(locations)
        .values(
          ready.map((location) => ({
            worldId: copy!.id,
            parentId: location.parentId ? newIds.get(location.parentId)! : null,
            name: location.name,
            summary: location.summary,
            description: location.description,
            position: location.position,
          })),
        )
        .returning({ id: locations.id });
      ready.forEach((location, index) => newIds.set(location.id, inserted[index]!.id));
      pending = pending.filter((location) => !newIds.has(location.id));
    }

    await recordAudit(tx, {
      actor,
      action: 'world.add',
      targetType: 'world',
      targetId: copy!.id,
      communityId,
      after: { name: copy!.name, sourceWorldId: source.id, locations: newIds.size },
    });
    await emitEvent(tx, 'world.copied', { worldId: copy!.id, sourceWorldId: source.id, communityId });

    return copy!;
  });
}
