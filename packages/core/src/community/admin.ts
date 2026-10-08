import {
  characterFieldInputSchema,
  communitySettingsSchema,
  PERMISSION_KEYS,
  PERMISSIONS,
  roleInputSchema,
  type CharacterFieldInput,
  type CommunitySettingsInput,
  type PermissionKey,
  type RoleInput,
} from '@worldroot/contracts';
import {
  auditLog,
  characterFieldDefinitions,
  characters,
  communities,
  communityMembers,
  profiles,
  roleAssignments,
  roles,
  type Db,
} from '@worldroot/db';
import { and, asc, desc, eq, inArray, isNull, max } from 'drizzle-orm';
import { recordAudit } from '../platform/audit';
import { authorize, resolvePermissions, type Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { parseInput } from '../platform/validate';
import { communityGrants, isMember, type CharacterField, type Community, type Role } from './service';

/** Permissions that open some part of a community's settings. */
export const ADMIN_PERMISSIONS: PermissionKey[] = [
  'community.manage',
  'community.invite',
  'role.manage',
  'member.kick',
  'member.ban',
  'characterfield.manage',
  'character.approve',
  'auditlog.view',
];

const OWNER_POSITION = 1000;

interface Standing {
  isOwner: boolean;
  /** The position of the actor's highest role. They manage only what sits below it. */
  top: number;
  permissions: Set<PermissionKey>;
}

/** Where an actor stands in a community: their rank and what they hold community-wide. */
async function standingOf(db: Db, actor: Actor, communityId: string): Promise<Standing> {
  if (actor.platformRole === 'staff') return { isOwner: true, top: OWNER_POSITION + 1, permissions: new Set(PERMISSION_KEYS) };
  const held = await db
    .select({ position: roles.position, isOwner: roles.isOwner })
    .from(roleAssignments)
    .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
    .where(
      and(eq(roleAssignments.userId, actor.userId), eq(roleAssignments.communityId, communityId), isNull(roleAssignments.scopeWorldId)),
    );
  const grants = await communityGrants(db).getGrants(actor.userId, communityId);
  return {
    isOwner: held.some((role) => role.isOwner),
    top: Math.max(-1, ...held.map((role) => role.position)),
    permissions: resolvePermissions(grants),
  };
}

const forbidden = (message: string) => new DomainError('forbidden', message);

/** Updates a community's details and settings. */
export async function updateCommunity(db: Db, actor: Actor, communityId: string, input: CommunitySettingsInput): Promise<Community> {
  await authorize(actor, 'community.manage', { communityId }, communityGrants(db));
  const values = parseInput(communitySettingsSchema, input);
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(communities).where(eq(communities.id, communityId));
    if (!before) throw new DomainError('not_found', 'That community does not exist.');
    const [after] = await tx.update(communities).set(values).where(eq(communities.id, communityId)).returning();
    const changed = (Object.keys(values) as Array<keyof typeof values>).filter((key) => before[key] !== after![key]);
    await recordAudit(tx, {
      actor,
      action: 'community.update',
      targetType: 'community',
      targetId: communityId,
      communityId,
      before: Object.fromEntries(changed.map((key) => [key, before[key]])),
      after: Object.fromEntries(changed.map((key) => [key, after![key]])),
    });
    return after!;
  });
}

async function requireRole(db: Db, roleId: string): Promise<Role> {
  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  if (!role) throw new DomainError('not_found', 'That role does not exist.');
  return role;
}

/** A role manager can hand out only what they hold themselves. This stops anyone promoting past their own powers. */
function assertCanGrant(standing: Standing, permissions: readonly PermissionKey[]): void {
  if (standing.isOwner) return;
  const beyond = permissions.filter((key) => !standing.permissions.has(key));
  if (beyond.length > 0) {
    throw forbidden(`You can only grant permissions you hold. You do not hold: ${beyond.map((key) => PERMISSIONS[key].label).join(', ')}.`);
  }
}

/** Creates a role just below the actor's own highest role. */
export async function createManagedRole(db: Db, actor: Actor, communityId: string, input: RoleInput): Promise<Role> {
  await authorize(actor, 'role.manage', { communityId }, communityGrants(db));
  const values = parseInput(roleInputSchema, input);
  const standing = await standingOf(db, actor, communityId);
  assertCanGrant(standing, values.permissions);

  return db.transaction(async (tx) => {
    const [highest] = await tx
      .select({ value: max(roles.position) })
      .from(roles)
      .where(and(eq(roles.communityId, communityId), eq(roles.isOwner, false)));
    // New roles go above the existing ones, but always below whoever made them.
    const position = Math.min((highest?.value ?? 0) + 10, Math.min(standing.top, OWNER_POSITION) - 1);
    const [role] = await tx
      .insert(roles)
      .values({ communityId, name: values.name, permissions: values.permissions, position })
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

/** Renames a role or changes what it grants. The Owner role is fixed. */
export async function updateRole(db: Db, actor: Actor, roleId: string, input: RoleInput): Promise<Role> {
  const role = await requireRole(db, roleId);
  await authorize(actor, 'role.manage', { communityId: role.communityId }, communityGrants(db));
  const values = parseInput(roleInputSchema, input);
  const standing = await standingOf(db, actor, role.communityId);
  if (role.isOwner) throw forbidden('The Owner role always holds every permission and cannot be changed.');
  if (role.position >= standing.top) throw forbidden('You can only change roles below your own.');
  // Only newly added permissions need checking: a manager may leave in place what a role already had.
  assertCanGrant(standing, values.permissions.filter((key) => !role.permissions.includes(key)));

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(roles)
      .set({ name: role.isDefault ? role.name : values.name, permissions: values.permissions })
      .where(eq(roles.id, roleId))
      .returning();
    await recordAudit(tx, {
      actor,
      action: 'role.update',
      targetType: 'role',
      targetId: roleId,
      communityId: role.communityId,
      before: { name: role.name, permissions: role.permissions },
      after: { name: updated!.name, permissions: updated!.permissions },
    });
    return updated!;
  });
}

/** Deletes a custom role. Everyone who held it loses it. The two built-in roles stay. */
export async function deleteRole(db: Db, actor: Actor, roleId: string): Promise<void> {
  const role = await requireRole(db, roleId);
  await authorize(actor, 'role.manage', { communityId: role.communityId }, communityGrants(db));
  const standing = await standingOf(db, actor, role.communityId);
  if (role.isOwner || role.isDefault) throw forbidden('The built-in Owner and Member roles cannot be deleted.');
  if (role.position >= standing.top) throw forbidden('You can only delete roles below your own.');

  await db.transaction(async (tx) => {
    await tx.delete(roles).where(eq(roles.id, roleId));
    await recordAudit(tx, {
      actor,
      action: 'role.delete',
      targetType: 'role',
      targetId: roleId,
      communityId: role.communityId,
      before: { name: role.name, permissions: role.permissions },
    });
  });
}

export interface MemberRow {
  userId: string;
  displayName: string;
  handle: string;
  joinedAt: Date;
  roles: Array<{ id: string; name: string; isOwner: boolean; isDefault: boolean; position: number }>;
}

/** Everyone in a community with the roles they hold, highest-ranked first. */
export async function listMembers(db: Db, communityId: string): Promise<MemberRow[]> {
  const people = await db
    .select({ userId: communityMembers.userId, joinedAt: communityMembers.joinedAt, displayName: profiles.displayName, handle: profiles.handle })
    .from(communityMembers)
    .innerJoin(profiles, eq(profiles.userId, communityMembers.userId))
    .where(eq(communityMembers.communityId, communityId))
    .orderBy(asc(communityMembers.joinedAt));
  const held = await db
    .select({ userId: roleAssignments.userId, id: roles.id, name: roles.name, isOwner: roles.isOwner, isDefault: roles.isDefault, position: roles.position })
    .from(roleAssignments)
    .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
    .where(eq(roleAssignments.communityId, communityId))
    .orderBy(desc(roles.position));

  const rank = (row: MemberRow) => Math.max(-1, ...row.roles.map((role) => role.position));
  return people
    .map((person) => ({ ...person, roles: held.filter((role) => role.userId === person.userId).map(({ userId: _userId, ...role }) => role) }))
    .sort((a, b) => rank(b) - rank(a));
}

async function rankOf(db: Db, userId: string, communityId: string): Promise<number> {
  const held = await db
    .select({ position: roles.position })
    .from(roleAssignments)
    .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
    .where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.communityId, communityId)));
  return Math.max(-1, ...held.map((role) => role.position));
}

/** Gives a member a role. Only roles below the actor's own can be handed out. */
export async function assignRole(db: Db, actor: Actor, roleId: string, userId: string): Promise<void> {
  const role = await requireRole(db, roleId);
  await authorize(actor, 'role.manage', { communityId: role.communityId }, communityGrants(db));
  const standing = await standingOf(db, actor, role.communityId);
  if (role.position >= standing.top) throw forbidden('You can only assign roles below your own.');
  if (!(await isMember(db, userId, role.communityId))) throw new DomainError('not_found', 'That person is not a member.');

  await db.transaction(async (tx) => {
    const added = await tx
      .insert(roleAssignments)
      .values({ communityId: role.communityId, userId, roleId })
      .onConflictDoNothing()
      .returning({ id: roleAssignments.id });
    if (added.length === 0) return;
    await recordAudit(tx, {
      actor,
      action: 'role.assign',
      targetType: 'user',
      targetId: userId,
      communityId: role.communityId,
      after: { role: role.name },
    });
  });
}

/** Takes a role away from a member. The Member role stays for as long as they belong. */
export async function unassignRole(db: Db, actor: Actor, roleId: string, userId: string): Promise<void> {
  const role = await requireRole(db, roleId);
  await authorize(actor, 'role.manage', { communityId: role.communityId }, communityGrants(db));
  const standing = await standingOf(db, actor, role.communityId);
  if (role.isDefault) throw forbidden('Every member keeps the Member role.');
  if (role.position >= standing.top) throw forbidden('You can only remove roles below your own.');

  await db.transaction(async (tx) => {
    const removed = await tx
      .delete(roleAssignments)
      .where(and(eq(roleAssignments.roleId, roleId), eq(roleAssignments.userId, userId)))
      .returning({ id: roleAssignments.id });
    if (removed.length === 0) return;
    await recordAudit(tx, {
      actor,
      action: 'role.unassign',
      targetType: 'user',
      targetId: userId,
      communityId: role.communityId,
      before: { role: role.name },
    });
  });
}

/** Removes a member from the community. They may rejoin. Their characters and posts stay. */
export async function removeMember(db: Db, actor: Actor, communityId: string, userId: string): Promise<void> {
  await authorize(actor, 'member.kick', { communityId }, communityGrants(db));
  if (userId === actor.userId) throw forbidden('You cannot remove yourself.');
  const standing = await standingOf(db, actor, communityId);
  if ((await rankOf(db, userId, communityId)) >= standing.top) throw forbidden('You can only remove members ranked below you.');

  await db.transaction(async (tx) => {
    const removed = await tx
      .delete(communityMembers)
      .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)))
      .returning({ userId: communityMembers.userId });
    if (removed.length === 0) throw new DomainError('not_found', 'That person is not a member.');
    await tx.delete(roleAssignments).where(and(eq(roleAssignments.communityId, communityId), eq(roleAssignments.userId, userId)));
    await recordAudit(tx, { actor, action: 'member.remove', targetType: 'user', targetId: userId, communityId });
  });
}

/** Adds a field to the community's character template, after the existing ones. */
export async function createCharacterField(db: Db, actor: Actor, communityId: string, input: CharacterFieldInput): Promise<CharacterField> {
  await authorize(actor, 'characterfield.manage', { communityId }, communityGrants(db));
  const values = parseInput(characterFieldInputSchema, input);
  return db.transaction(async (tx) => {
    const [last] = await tx
      .select({ value: max(characterFieldDefinitions.position) })
      .from(characterFieldDefinitions)
      .where(eq(characterFieldDefinitions.communityId, communityId));
    const [field] = await tx
      .insert(characterFieldDefinitions)
      .values({
        communityId,
        label: values.label,
        type: values.type,
        required: values.required,
        options: values.type === 'single_choice' ? values.options : null,
        position: (last?.value ?? -1) + 1,
      })
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

/** Retires a template field. Values already on characters are kept and hidden, not lost. */
export async function removeCharacterField(db: Db, actor: Actor, fieldId: string): Promise<void> {
  const [field] = await db.select().from(characterFieldDefinitions).where(eq(characterFieldDefinitions.id, fieldId));
  if (!field || field.deletedAt) throw new DomainError('not_found', 'That field does not exist.');
  await authorize(actor, 'characterfield.manage', { communityId: field.communityId }, communityGrants(db));
  await db.transaction(async (tx) => {
    await tx.update(characterFieldDefinitions).set({ deletedAt: new Date() }).where(eq(characterFieldDefinitions.id, fieldId));
    await recordAudit(tx, {
      actor,
      action: 'characterfield.remove',
      targetType: 'character_field',
      targetId: fieldId,
      communityId: field.communityId,
      before: { label: field.label },
    });
  });
}

export interface PendingCharacter {
  id: string;
  name: string;
  tagline: string | null;
  playerName: string | null;
  playerHandle: string | null;
  status: 'pending' | 'returned';
}

/** Characters waiting for review, and those sent back to their players. */
export async function listCharactersForReview(db: Db, communityId: string): Promise<PendingCharacter[]> {
  const rows = await db
    .select({
      id: characters.id,
      name: characters.name,
      tagline: characters.tagline,
      status: characters.approvalStatus,
      playerName: profiles.displayName,
      playerHandle: profiles.handle,
    })
    .from(characters)
    .leftJoin(profiles, eq(profiles.userId, characters.playerUserId))
    .where(and(eq(characters.communityId, communityId), inArray(characters.approvalStatus, ['pending', 'returned'])))
    .orderBy(asc(characters.createdAt));
  return rows as PendingCharacter[];
}

export type ReviewDecision = 'approved' | 'returned';

/** Approves a character for play, or returns it to its player. */
export async function reviewCharacter(db: Db, actor: Actor, characterId: string, decision: ReviewDecision): Promise<void> {
  const [character] = await db.select().from(characters).where(eq(characters.id, characterId));
  if (!character?.communityId) throw new DomainError('not_found', 'That character is not in a community.');
  await authorize(actor, 'character.approve', { communityId: character.communityId }, communityGrants(db));
  if (character.approvalStatus === decision) return;

  await db.transaction(async (tx) => {
    await tx.update(characters).set({ approvalStatus: decision }).where(eq(characters.id, characterId));
    await recordAudit(tx, {
      actor,
      action: decision === 'approved' ? 'character.approve' : 'character.return',
      targetType: 'character',
      targetId: characterId,
      communityId: character.communityId,
      before: { approvalStatus: character.approvalStatus },
      after: { approvalStatus: decision, name: character.name },
    });
  });
}

export interface AuditRow {
  id: string;
  action: string;
  targetType: string;
  actorName: string | null;
  actorHandle: string | null;
  before: unknown;
  after: unknown;
  createdAt: Date;
}

/** The most recent privileged actions in a community, newest first. */
export async function listAuditLog(db: Db, actor: Actor, communityId: string, limit = 100): Promise<AuditRow[]> {
  await authorize(actor, 'auditlog.view', { communityId }, communityGrants(db));
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      targetType: auditLog.targetType,
      actorName: profiles.displayName,
      actorHandle: profiles.handle,
      before: auditLog.before,
      after: auditLog.after,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(profiles, eq(profiles.userId, auditLog.actorUserId))
    .where(eq(auditLog.communityId, communityId))
    .orderBy(desc(auditLog.id))
    .limit(Math.min(limit, 200));
}

async function requireOwner(db: Db, actor: Actor, communityId: string): Promise<Community> {
  const [community] = await db.select().from(communities).where(eq(communities.id, communityId));
  if (!community) throw new DomainError('not_found', 'That community does not exist.');
  // Ownership is read from the role itself, so it still holds while an archived community grants no permissions.
  if (!(await standingOf(db, actor, communityId)).isOwner) throw forbidden('Only the community’s owner can do that.');
  return community;
}

/**
 * Archives a community, or restores it. An archived community is frozen:
 * nobody can post, join, start scenes or change anything, and only its
 * members can still see it. Nothing is deleted, and restoring undoes it fully.
 */
export async function setCommunityArchived(db: Db, actor: Actor, communityId: string, archived: boolean): Promise<Community> {
  const community = await requireOwner(db, actor, communityId);
  if (archived === Boolean(community.archivedAt)) return community;
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(communities)
      .set({ archivedAt: archived ? new Date() : null })
      .where(eq(communities.id, communityId))
      .returning();
    await recordAudit(tx, {
      actor,
      action: archived ? 'community.archive' : 'community.restore',
      targetType: 'community',
      targetId: communityId,
      communityId,
    });
    return updated!;
  });
}

/**
 * Deletes a community for good, with its worlds, locations, characters,
 * scenes, posts, spaces, roles, invites and bans. The caller must repeat the
 * community's name, so it cannot happen by a stray click. Library originals
 * that were copied into it are not affected.
 */
export async function deleteCommunity(db: Db, actor: Actor, communityId: string, confirmName: string): Promise<void> {
  const community = await requireOwner(db, actor, communityId);
  if (confirmName.trim().toLowerCase() !== community.name.trim().toLowerCase()) {
    const message = 'Type the community’s name exactly to confirm.';
    throw new DomainError('invalid_input', message, { fields: { confirmName: message } });
  }
  await db.transaction(async (tx) => {
    // The audit log has no foreign key to communities, so this record outlives what it describes.
    await recordAudit(tx, {
      actor,
      action: 'community.delete',
      targetType: 'community',
      targetId: communityId,
      communityId,
      before: { slug: community.slug, name: community.name },
    });
    await tx.delete(communities).where(eq(communities.id, communityId));
  });
}

export interface AdminView {
  /** The actor's rank. Roles and members at or above it are out of their reach. */
  top: number;
  isOwner: boolean;
  permissions: PermissionKey[];
}

/** What the settings screens need to know about the person using them. */
export async function getAdminView(db: Db, actor: Actor, communityId: string): Promise<AdminView> {
  const standing = await standingOf(db, actor, communityId);
  return { top: standing.top, isOwner: standing.isOwner, permissions: [...standing.permissions] };
}
