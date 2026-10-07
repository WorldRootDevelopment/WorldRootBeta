import { PERMISSIONS, type PermissionKey } from '@worldroot/contracts';
import { DomainError } from './errors';

/** The signed-in person a service call acts for. */
export interface Actor {
  userId: string;
  platformRole: 'user' | 'staff';
}

/** One role a member holds in a community, as the resolver needs it. */
export interface RoleGrant {
  permissions: readonly PermissionKey[];
  /** The built-in Owner role holds every permission. */
  isOwner: boolean;
  /** Null applies community-wide. A world id limits the grant to that world. */
  scopeWorldId: string | null;
}

/** Where a community action takes place. */
export interface CommunityResource {
  communityId: string;
  worldId?: string | null;
}

/** Supplies an actor's role grants in a community. Implemented by the community module. */
export interface GrantSource {
  getGrants(userId: string, communityId: string): Promise<readonly RoleGrant[]>;
}

/**
 * Effective permissions are the union of every applicable grant.
 * There are no deny rules: a grant can only ever add.
 */
export function resolvePermissions(grants: readonly RoleGrant[], worldId?: string | null): Set<PermissionKey> {
  const effective = new Set<PermissionKey>();
  for (const grant of grants) {
    if (grant.scopeWorldId !== null && grant.scopeWorldId !== worldId) continue;
    if (grant.isOwner) return new Set(Object.keys(PERMISSIONS) as PermissionKey[]);
    for (const key of grant.permissions) effective.add(key);
  }
  return effective;
}

export async function can(
  actor: Actor,
  permission: PermissionKey,
  resource: CommunityResource,
  source: GrantSource,
): Promise<boolean> {
  // Platform staff are checked before community rules. Their actions are audit-logged by the caller.
  if (actor.platformRole === 'staff') return true;
  const grants = await source.getGrants(actor.userId, resource.communityId);
  return resolvePermissions(grants, resource.worldId).has(permission);
}

/** Throws a `forbidden` error naming the missing permission unless the actor holds it. */
export async function authorize(
  actor: Actor,
  permission: PermissionKey,
  resource: CommunityResource,
  source: GrantSource,
): Promise<void> {
  if (await can(actor, permission, resource, source)) return;
  throw new DomainError('forbidden', `You need the "${PERMISSIONS[permission].label}" permission to do that.`, {
    permission,
  });
}

/** For resources a user owns outright, such as their profile and library. */
export function authorizeOwner(actor: Actor, ownerUserId: string): void {
  if (actor.userId === ownerUserId || actor.platformRole === 'staff') return;
  throw new DomainError('forbidden', 'Only the owner can do that.');
}
