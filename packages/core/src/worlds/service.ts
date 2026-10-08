import { locationInputSchema, worldInputSchema, type LocationInput, type WorldInput } from '@worldroot/contracts';
import { locations, worlds, type Db } from '@worldroot/db';
import { randomBytes } from 'node:crypto';
import { and, asc, eq, max } from 'drizzle-orm';
import { assertSlug, communityGrants } from '../community/service';
import { recordAudit } from '../platform/audit';
import { authorize, authorizeOwner, can, type Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { emitEvent } from '../platform/outbox';
import { parseInput, slugify } from '../platform/validate';

export type World = typeof worlds.$inferSelect;
export type Location = typeof locations.$inferSelect;

const MAX_LOCATION_DEPTH = 5;

export type CreateWorldInput = WorldInput & {
  /** The address within the owner's library. Derived from the name when omitted. */
  slug?: string;
};

type WorldOwner = { userId: string } | { communityId: string };

const ownedBy = (owner: WorldOwner) => ('userId' in owner ? eq(worlds.ownerUserId, owner.userId) : eq(worlds.ownerCommunityId, owner.communityId));

/** A slug no other world of this owner uses: the given one, numbered if taken. */
async function freeSlug(db: Db, owner: WorldOwner, name: string): Promise<string> {
  const base = slugify(name) || 'world';
  const taken = new Set((await db.select({ slug: worlds.slug }).from(worlds).where(ownedBy(owner))).map((row) => row.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** Creates a world in the actor's own library. Only the name is required. */
export async function createWorld(db: Db, actor: Actor, input: CreateWorldInput): Promise<World> {
  const values = parseInput(worldInputSchema, input);
  if (input.slug) {
    assertSlug(input.slug);
    const [taken] = await db
      .select({ id: worlds.id })
      .from(worlds)
      .where(and(eq(worlds.ownerUserId, actor.userId), eq(worlds.slug, input.slug)));
    if (taken) throw new DomainError('conflict', 'You already have a world at that address.');
  }
  const [world] = await db
    .insert(worlds)
    .values({ ...values, slug: input.slug ?? (await freeSlug(db, { userId: actor.userId }, values.name)), ownerUserId: actor.userId })
    .returning();
  return world!;
}

async function requireWorld(db: Db, worldId: string): Promise<World> {
  const [world] = await db.select().from(worlds).where(eq(worlds.id, worldId));
  if (!world) throw new DomainError('not_found', 'That world does not exist.');
  return world;
}

/** Loads a world from the actor's own library. Other people's library worlds do not exist to them. */
export async function getLibraryWorld(db: Db, actor: Actor, worldId: string): Promise<World> {
  const [world] = await db.select().from(worlds).where(eq(worlds.id, worldId));
  if (!world?.ownerUserId || (world.ownerUserId !== actor.userId && actor.platformRole !== 'staff')) {
    throw new DomainError('not_found', 'That world does not exist.');
  }
  return world;
}

/** Updates a world's details. A library world by its owner, a community world by its managers. */
export async function updateWorld(db: Db, actor: Actor, worldId: string, input: WorldInput): Promise<World> {
  const values = parseInput(worldInputSchema, input);
  const world = await requireWorld(db, worldId);
  if (world.ownerUserId) authorizeOwner(actor, world.ownerUserId);
  else await authorize(actor, 'world.manage', { communityId: world.ownerCommunityId!, worldId }, communityGrants(db));

  return db.transaction(async (tx) => {
    const [updated] = await tx.update(worlds).set(values).where(eq(worlds.id, worldId)).returning();
    if (world.ownerCommunityId) {
      await recordAudit(tx, {
        actor,
        action: 'world.update',
        targetType: 'world',
        targetId: worldId,
        communityId: world.ownerCommunityId,
        before: { name: world.name },
        after: { name: updated!.name },
      });
    }
    return updated!;
  });
}

export type CreateLocationInput = LocationInput & {
  parentId?: string | null;
  /** Order among its siblings. Placed last when omitted. */
  position?: number;
};

/** Adds a location to a world. Only the name is required. */
export async function createLocation(db: Db, actor: Actor, worldId: string, input: CreateLocationInput): Promise<Location> {
  const values = parseInput(locationInputSchema, input);
  const world = await requireWorld(db, worldId);
  if (world.ownerUserId) authorizeOwner(actor, world.ownerUserId);
  else await authorize(actor, 'location.create', { communityId: world.ownerCommunityId!, worldId }, communityGrants(db));

  const parentId = input.parentId ?? null;
  if (parentId) {
    const byId = new Map((await listLocations(db, worldId)).map((location) => [location.id, location]));
    if (!byId.has(parentId)) throw new DomainError('invalid_input', 'The parent location is not in this world.');
    let depth = 1;
    for (let at = byId.get(parentId); at; at = at.parentId ? byId.get(at.parentId) : undefined) depth += 1;
    if (depth > MAX_LOCATION_DEPTH) {
      throw new DomainError('invalid_input', `Locations can nest ${MAX_LOCATION_DEPTH} levels deep at most.`);
    }
  }

  let position = input.position;
  if (position === undefined) {
    const [last] = await db.select({ value: max(locations.position) }).from(locations).where(eq(locations.worldId, worldId));
    position = (last?.value ?? -1) + 1;
  }

  const [location] = await db
    .insert(locations)
    .values({ ...values, worldId, parentId, position })
    .returning();
  return location!;
}

/** Whether the actor may add and edit locations in a world. */
export async function canEditLocations(db: Db, actor: Actor, world: World): Promise<boolean> {
  if (actor.platformRole === 'staff') return true;
  if (world.ownerUserId) return world.ownerUserId === actor.userId;
  return can(actor, 'location.manage', { communityId: world.ownerCommunityId!, worldId: world.id }, communityGrants(db));
}

export async function updateLocation(db: Db, actor: Actor, locationId: string, input: LocationInput): Promise<Location> {
  const values = parseInput(locationInputSchema, input);
  const [location] = await db.select().from(locations).where(eq(locations.id, locationId));
  if (!location) throw new DomainError('not_found', 'That location does not exist.');
  const world = await requireWorld(db, location.worldId);
  if (world.ownerUserId) authorizeOwner(actor, world.ownerUserId);
  else {
    await authorize(actor, 'location.manage', { communityId: world.ownerCommunityId!, worldId: world.id }, communityGrants(db));
  }
  const [updated] = await db.update(locations).set(values).where(eq(locations.id, locationId)).returning();
  return updated!;
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

/** World ids use letters and digits that are hard to misread: no I, L, O or U. */
const SHARE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const newShareCode = () => {
  const letters = [...randomBytes(8)].map((byte) => SHARE_ALPHABET[byte % SHARE_ALPHABET.length]).join('');
  return `${letters.slice(0, 4)}-${letters.slice(4)}`;
};

/** Accepts an id however it was typed or pasted: any case, with or without the hyphen or spaces. */
const normaliseShareCode = (value: string) => {
  const letters = value.toUpperCase().replace(/[^0-9A-Z]/g, '');
  return letters.length === 8 ? `${letters.slice(0, 4)}-${letters.slice(4)}` : null;
};

/**
 * Turns sharing of a library world on or off. While it is on, the world has an
 * id that lets anyone holding it take their own copy. Turning it off retires
 * the id; copies already made are not affected.
 */
export async function setWorldSharing(db: Db, actor: Actor, worldId: string, shared: boolean): Promise<World> {
  const world = await getLibraryWorld(db, actor, worldId);
  authorizeOwner(actor, world.ownerUserId!);
  if (shared === Boolean(world.shareCode)) return world;
  const [updated] = await db
    .update(worlds)
    .set({ shareCode: shared ? newShareCode() : null })
    .where(eq(worlds.id, worldId))
    .returning();
  return updated!;
}

/** The library world a share id points at. An unknown or retired id tells the caller nothing more. */
async function requireSharedWorld(db: Db, code: string): Promise<World> {
  const clean = normaliseShareCode(code);
  const [world] = clean ? await db.select().from(worlds).where(eq(worlds.shareCode, clean)) : [];
  if (!world?.ownerUserId) {
    const message = 'No world is shared under that ID. Check it with whoever gave it to you.';
    throw new DomainError('not_found', message, { fields: { worldId: message } });
  }
  return world;
}

/** Copies a world and its whole location tree to a new owner. The copy remembers its source. Call inside a transaction. */
async function cloneWorld(tx: Db, source: World, owner: WorldOwner): Promise<{ copy: World; locationCount: number }> {
  const [copy] = await tx
    .insert(worlds)
    .values({
      ...('userId' in owner ? { ownerUserId: owner.userId } : { ownerCommunityId: owner.communityId }),
      sourceWorldId: source.id,
      copiedAt: new Date(),
      slug: await freeSlug(tx, owner, source.slug),
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
  return { copy: copy!, locationCount: newIds.size };
}

/** Where a community's new world comes from: one of the actor's own library worlds, or a world someone shared by id. */
export type WorldSource = { worldId: string } | { shareCode: string };

/**
 * Gives a community its own copy of a world, with its whole location tree.
 * Only someone who holds "Add worlds" in that community may. The copy
 * remembers its source and is otherwise independent: later edits on either
 * side never reach the other.
 */
export async function copyWorldToCommunity(db: Db, actor: Actor, from: string | WorldSource, communityId: string): Promise<World> {
  await authorize(actor, 'world.add', { communityId }, communityGrants(db));
  const source = typeof from === 'string' ? { worldId: from } : from;

  let world: World;
  if ('shareCode' in source) {
    world = await requireSharedWorld(db, source.shareCode);
  } else {
    world = await requireWorld(db, source.worldId);
    if (!world.ownerUserId) throw new DomainError('invalid_input', 'Only a library world can be added to a community.');
    authorizeOwner(actor, world.ownerUserId);
  }

  return db.transaction(async (tx) => {
    const { copy, locationCount } = await cloneWorld(tx, world, { communityId });
    await recordAudit(tx, {
      actor,
      action: 'world.add',
      targetType: 'world',
      targetId: copy.id,
      communityId,
      after: { name: copy.name, sourceWorldId: world.id, locations: locationCount, byWorldId: 'shareCode' in source },
    });
    await emitEvent(tx, 'world.copied', { worldId: copy.id, sourceWorldId: world.id, communityId });
    return copy;
  });
}

/** Takes a copy of a shared world into the actor's own library, to keep, change or add to a community. */
export async function importSharedWorld(db: Db, actor: Actor, shareCode: string): Promise<World> {
  const world = await requireSharedWorld(db, shareCode);
  if (world.ownerUserId === actor.userId) {
    const message = 'That is your own world. It is already in your library.';
    throw new DomainError('invalid_input', message, { fields: { worldId: message } });
  }
  return db.transaction(async (tx) => (await cloneWorld(tx, world, { userId: actor.userId })).copy);
}
