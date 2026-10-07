import { DEFAULT_MEMBER_PERMISSIONS, isPermissionKey, type PermissionKey } from '@worldroot/contracts';
import {
  characterFieldDefinitions,
  communities,
  communityMembers,
  roleAssignments,
  roles,
  type Db,
} from '@worldroot/db';
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import { recordAudit } from '../platform/audit';
import { authorize, resolvePermissions, type Actor, type GrantSource } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { emitEvent } from '../platform/outbox';

export type Community = typeof communities.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type CharacterField = typeof characterFieldDefinitions.$inferSelect;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertSlug(slug: string): void {
  if (!SLUG.test(slug) || slug.length > 60) {
    throw new DomainError('invalid_input', 'Use lowercase letters, numbers and single hyphens.', {
      fields: { slug: 'Use lowercase letters, numbers and single hyphens.' },
    });
  }
}

/** Reads an actor's role grants from the database, for `authorize`. */
export const communityGrants = (db: Db): GrantSource => ({
  async getGrants(userId, communityId) {
    const rows = await db
      .select({ permissions: roles.permissions, isOwner: roles.isOwner, scopeWorldId: roleAssignments.scopeWorldId })
      .from(roleAssignments)
      .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
      .where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.communityId, communityId)));
    return rows.map((row) => ({ ...row, permissions: row.permissions.filter(isPermissionKey) }));
  },
});

export interface CreateCommunityInput {
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  rules?: string;
  accentHue?: number;
  listed?: boolean;
}

/** Creates a community with its two built-in roles and makes the actor its owner. */
export async function createCommunity(db: Db, actor: Actor, input: CreateCommunityInput): Promise<Community> {
  assertSlug(input.slug);
  const hue = input.accentHue ?? 155;
  if (!Number.isInteger(hue) || hue < 0 || hue >= 360) {
    throw new DomainError('invalid_input', 'The accent hue is a whole number from 0 to 359.');
  }

  return db.transaction(async (tx) => {
    const [taken] = await tx.select({ id: communities.id }).from(communities).where(eq(communities.slug, input.slug));
    if (taken) throw new DomainError('conflict', 'That address is taken.', { fields: { slug: 'That address is taken.' } });

    const [community] = await tx
      .insert(communities)
      .values({ ...input, accentHue: hue })
      .returning();

    const [owner, member] = await tx
      .insert(roles)
      .values([
        { communityId: community!.id, name: 'Owner', position: 1000, isOwner: true },
        { communityId: community!.id, name: 'Member', position: 0, isDefault: true, permissions: DEFAULT_MEMBER_PERMISSIONS },
      ])
      .returning();

    await tx.insert(communityMembers).values({ communityId: community!.id, userId: actor.userId });
    await tx.insert(roleAssignments).values([
      { communityId: community!.id, userId: actor.userId, roleId: owner!.id },
      { communityId: community!.id, userId: actor.userId, roleId: member!.id },
    ]);

    await recordAudit(tx, {
      actor,
      action: 'community.create',
      targetType: 'community',
      targetId: community!.id,
      communityId: community!.id,
      after: { slug: community!.slug, name: community!.name },
    });
    await emitEvent(tx, 'community.created', { communityId: community!.id });

    return community!;
  });
}

export interface CreateRoleInput {
  name: string;
  position: number;
  permissions: PermissionKey[];
}

export async function createRole(db: Db, actor: Actor, communityId: string, input: CreateRoleInput): Promise<Role> {
  await authorize(actor, 'role.manage', { communityId }, communityGrants(db));
  return db.transaction(async (tx) => {
    const [role] = await tx
      .insert(roles)
      .values({ communityId, ...input })
      .returning();
    await recordAudit(tx, {
      actor,
      action: 'role.create',
      targetType: 'role',
      targetId: role!.id,
      communityId,
      after: { name: role!.name, permissions: role!.permissions },
    });
    return role!;
  });
}

export interface CreateCharacterFieldInput {
  label: string;
  type?: CharacterField['type'];
  required?: boolean;
  options?: string[];
  position?: number;
}

export async function addCharacterField(
  db: Db,
  actor: Actor,
  communityId: string,
  input: CreateCharacterFieldInput,
): Promise<CharacterField> {
  await authorize(actor, 'characterfield.manage', { communityId }, communityGrants(db));
  return db.transaction(async (tx) => {
    const [field] = await tx
      .insert(characterFieldDefinitions)
      .values({ communityId, ...input })
      .returning();
    await recordAudit(tx, {
      actor,
      action: 'characterfield.create',
      targetType: 'character_field',
      targetId: field!.id,
      communityId,
      after: { label: field!.label, type: field!.type, required: field!.required },
    });
    return field!;
  });
}

export async function listCharacterFields(db: Db, communityId: string): Promise<CharacterField[]> {
  return db
    .select()
    .from(characterFieldDefinitions)
    .where(and(eq(characterFieldDefinitions.communityId, communityId), isNull(characterFieldDefinitions.deletedAt)))
    .orderBy(asc(characterFieldDefinitions.position), asc(characterFieldDefinitions.id));
}

export async function isMember(db: Db, userId: string, communityId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: communityMembers.userId })
    .from(communityMembers)
    .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)));
  return Boolean(row);
}

/** Joins a listed community and receives its default role. Joining twice changes nothing. */
export async function joinCommunity(db: Db, actor: Actor, communityId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [community] = await tx.select().from(communities).where(eq(communities.id, communityId));
    if (!community) throw new DomainError('not_found', 'That community does not exist.');
    if (!community.listed) throw new DomainError('forbidden', 'This community is joined by invitation.');
    if (await isMember(tx, actor.userId, communityId)) return;

    await tx.insert(communityMembers).values({ communityId, userId: actor.userId });
    const defaults = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.communityId, communityId), eq(roles.isDefault, true)));
    if (defaults.length > 0) {
      await tx.insert(roleAssignments).values(defaults.map((role) => ({ communityId, userId: actor.userId, roleId: role.id })));
    }
    await emitEvent(tx, 'community.member_joined', { communityId, userId: actor.userId });
  });
}

export interface CommunityView {
  community: Community;
  isMember: boolean;
  /** The viewer's effective community-wide permissions. */
  permissions: PermissionKey[];
  memberCount: number;
}

/** Loads a community the actor may see: one they belong to, or a listed one. */
export async function getCommunityView(db: Db, actor: Actor, slug: string): Promise<CommunityView> {
  const [community] = await db.select().from(communities).where(eq(communities.slug, slug));
  const member = community ? await isMember(db, actor.userId, community.id) : false;
  if (!community || !(member || community.listed || actor.platformRole === 'staff')) {
    throw new DomainError('not_found', 'That community does not exist.');
  }
  const grants = await communityGrants(db).getGrants(actor.userId, community.id);
  const [members] = await db
    .select({ value: count() })
    .from(communityMembers)
    .where(eq(communityMembers.communityId, community.id));
  return {
    community,
    isMember: member,
    permissions: [...resolvePermissions(grants)],
    memberCount: members?.value ?? 0,
  };
}

export async function listMyCommunities(db: Db, userId: string): Promise<Community[]> {
  const rows = await db
    .select({ community: communities })
    .from(communityMembers)
    .innerJoin(communities, eq(communities.id, communityMembers.communityId))
    .where(eq(communityMembers.userId, userId))
    .orderBy(asc(communities.name));
  return rows.map((row) => row.community);
}

export async function listListedCommunities(db: Db): Promise<Community[]> {
  return db.select().from(communities).where(eq(communities.listed, true)).orderBy(asc(communities.name));
}

export async function listRoles(db: Db, communityId: string): Promise<Role[]> {
  return db.select().from(roles).where(eq(roles.communityId, communityId)).orderBy(desc(roles.position));
}
