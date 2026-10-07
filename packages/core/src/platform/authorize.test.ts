import { PERMISSION_KEYS } from '@worldroot/contracts';
import { describe, expect, it } from 'vitest';
import { authorize, authorizeOwner, can, resolvePermissions, type Actor, type GrantSource, type RoleGrant } from './authorize';
import { DomainError } from './errors';

const member: Actor = { userId: 'u1', platformRole: 'user' };
const staff: Actor = { userId: 'u2', platformRole: 'staff' };
const resource = { communityId: 'c1' };

const sourceOf = (grants: RoleGrant[]): GrantSource => ({ getGrants: async () => grants });

describe('resolvePermissions', () => {
  it('unions the permissions of every role', () => {
    const effective = resolvePermissions([
      { permissions: ['scene.create'], isOwner: false, scopeWorldId: null },
      { permissions: ['scene.join', 'lounge.post'], isOwner: false, scopeWorldId: null },
    ]);
    expect([...effective].sort()).toEqual(['lounge.post', 'scene.create', 'scene.join']);
  });

  it('gives the owner every permission', () => {
    const effective = resolvePermissions([{ permissions: [], isOwner: true, scopeWorldId: null }]);
    expect(effective.size).toBe(PERMISSION_KEYS.length);
  });

  it('applies a world-scoped grant only inside that world', () => {
    const grants: RoleGrant[] = [{ permissions: ['world.manage'], isOwner: false, scopeWorldId: 'w1' }];
    expect(resolvePermissions(grants, 'w1').has('world.manage')).toBe(true);
    expect(resolvePermissions(grants, 'w2').has('world.manage')).toBe(false);
    expect(resolvePermissions(grants).has('world.manage')).toBe(false);
  });
});

describe('authorize', () => {
  it('allows a member who holds the permission', async () => {
    const source = sourceOf([{ permissions: ['scene.create'], isOwner: false, scopeWorldId: null }]);
    await expect(authorize(member, 'scene.create', resource, source)).resolves.toBeUndefined();
  });

  it('refuses with the missing permission key', async () => {
    const error = await authorize(member, 'member.ban', resource, sourceOf([])).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ code: 'forbidden', permission: 'member.ban' });
  });

  it('lets platform staff through without a role', async () => {
    expect(await can(staff, 'member.ban', resource, sourceOf([]))).toBe(true);
  });
});

describe('authorizeOwner', () => {
  it('allows the owner and refuses anyone else', () => {
    expect(() => authorizeOwner(member, 'u1')).not.toThrow();
    expect(() => authorizeOwner(member, 'someone-else')).toThrow(DomainError);
  });
});
