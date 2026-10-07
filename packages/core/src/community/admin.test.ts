import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCharacterToCommunity, createCharacter, getCharacterView } from '../characters/service';
import { createProfile } from '../identity/profile';
import { authorize, type Actor } from '../platform/authorize';
import { createScene } from '../scenes/service';
import { docFromText } from '@worldroot/editor';
import {
  assignRole,
  createCharacterField,
  createManagedRole,
  deleteRole,
  getAdminView,
  listAuditLog,
  listCharactersForReview,
  listMembers,
  removeCharacterField,
  removeMember,
  reviewCharacter,
  unassignRole,
  updateCommunity,
  updateRole,
} from './admin';
import { communityGrants, createCommunity, getCommunityView, joinCommunity, listCharacterFields, listRoles, type Community } from './service';

let connection: DbConnection;
let owner: Actor;
let deputy: Actor;
let member: Actor;
let community: Community;

const addUser = async (handle: string): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com` }).returning();
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

const settings = {
  name: 'Bunn Valley',
  tagline: null,
  description: null,
  rules: null,
  accentHue: 30,
  listed: true,
  requireCharacterApproval: false,
};

beforeAll(async () => {
  connection = await createTestDb();
  owner = await addUser('owner');
  deputy = await addUser('deputy');
  member = await addUser('member');
  community = await createCommunity(connection.db, owner, { slug: 'bunn-valley', name: 'Bunn Valley', listed: true });
  await joinCommunity(connection.db, deputy, community.id);
  await joinCommunity(connection.db, member, community.id);
});

afterAll(async () => {
  await connection.close();
});

describe('community settings', () => {
  it('are changed by those who manage the community, and the change is recorded', async () => {
    const { db } = connection;
    await expect(updateCommunity(db, member, community.id, settings)).rejects.toMatchObject({ code: 'forbidden', permission: 'community.manage' });
    await expect(updateCommunity(db, owner, community.id, { ...settings, name: ' ', accentHue: 400 })).rejects.toMatchObject({
      code: 'invalid_input',
      fields: { name: 'Enter a name.' },
    });

    const updated = await updateCommunity(db, owner, community.id, { ...settings, tagline: 'A river town.', accentHue: 200 });
    expect(updated).toMatchObject({ tagline: 'A river town.', accentHue: 200, slug: 'bunn-valley' });

    const [entry] = (await listAuditLog(db, owner, community.id)).filter((row) => row.action === 'community.update');
    expect(entry).toMatchObject({ actorHandle: 'owner', before: { tagline: null, accentHue: 155 }, after: { tagline: 'A river town.', accentHue: 200 } });
    await expect(listAuditLog(db, member, community.id)).rejects.toMatchObject({ code: 'forbidden', permission: 'auditlog.view' });
  });
});

describe('roles', () => {
  it('cannot be used to climb past your own rank or powers', async () => {
    const { db } = connection;
    const moderator = await createManagedRole(db, owner, community.id, {
      name: 'Moderator',
      permissions: ['role.manage', 'member.kick', 'post.remove'],
    });
    await assignRole(db, owner, moderator.id, deputy.userId);
    expect(await getAdminView(db, deputy, community.id)).toMatchObject({ isOwner: false, top: moderator.position });

    // A moderator can make a lesser role from what they hold...
    const helper = await createManagedRole(db, deputy, community.id, { name: 'Helper', permissions: ['post.remove'] });
    expect(helper.position).toBeLessThan(moderator.position);
    // ...but cannot grant what they do not hold, edit their own role or the Owner role, or hand out a role at their level.
    await expect(createManagedRole(db, deputy, community.id, { name: 'Admin', permissions: ['community.manage'] })).rejects.toMatchObject({
      code: 'forbidden',
    });
    await expect(updateRole(db, deputy, moderator.id, { name: 'Moderator', permissions: ['role.manage'] })).rejects.toMatchObject({ code: 'forbidden' });
    await expect(updateRole(db, deputy, helper.id, { name: 'Helper', permissions: ['post.remove', 'member.ban'] })).rejects.toMatchObject({
      code: 'forbidden',
    });
    await expect(assignRole(db, deputy, moderator.id, member.userId)).rejects.toMatchObject({ code: 'forbidden' });
    const ownerRole = (await listRoles(db, community.id)).find((role) => role.isOwner)!;
    await expect(assignRole(db, deputy, ownerRole.id, deputy.userId)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(updateRole(db, owner, ownerRole.id, { name: 'King', permissions: [] })).rejects.toMatchObject({ code: 'forbidden' });
    await expect(unassignRole(db, owner, ownerRole.id, owner.userId)).rejects.toMatchObject({ code: 'forbidden' });

    // Assigning a role really grants its permissions, and removing it takes them away.
    await assignRole(db, deputy, helper.id, member.userId);
    const resource = { communityId: community.id };
    await expect(authorize(member, 'post.remove', resource, communityGrants(db))).resolves.toBeUndefined();
    await unassignRole(db, deputy, helper.id, member.userId);
    await expect(authorize(member, 'post.remove', resource, communityGrants(db))).rejects.toMatchObject({ code: 'forbidden' });

    // The Member role is editable but is never taken away or deleted.
    const memberRole = (await listRoles(db, community.id)).find((role) => role.isDefault)!;
    await expect(unassignRole(db, owner, memberRole.id, member.userId)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(deleteRole(db, owner, memberRole.id)).rejects.toMatchObject({ code: 'forbidden' });
    const renamed = await updateRole(db, owner, memberRole.id, { name: 'Peasant', permissions: ['scene.join'] });
    expect(renamed).toMatchObject({ name: 'Member', permissions: ['scene.join'] });

    await deleteRole(db, owner, helper.id);
    expect((await listRoles(db, community.id)).map((role) => role.name)).toEqual(['Owner', 'Moderator', 'Member']);
  });
});

describe('members', () => {
  it('are listed by rank and removed only by someone who outranks them', async () => {
    const { db } = connection;
    const before = await listMembers(db, community.id);
    expect(before.map((row) => row.handle)).toEqual(['owner', 'deputy', 'member']);
    expect(before[0]!.roles.map((role) => role.name)).toEqual(['Owner', 'Member']);

    await expect(removeMember(db, member, community.id, deputy.userId)).rejects.toMatchObject({ code: 'forbidden', permission: 'member.kick' });
    await expect(removeMember(db, deputy, community.id, owner.userId)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(removeMember(db, deputy, community.id, deputy.userId)).rejects.toMatchObject({ code: 'forbidden' });

    const guest = await addUser('guest');
    await joinCommunity(db, guest, community.id);
    await removeMember(db, deputy, community.id, guest.userId);
    expect((await listMembers(db, community.id)).map((row) => row.handle)).not.toContain('guest');
    expect((await getCommunityView(db, guest, 'bunn-valley')).isMember).toBe(false);
  });
});

describe('the character template and approval', () => {
  it('holds a submitted character out of scenes until it is approved', async () => {
    const { db } = connection;
    await expect(createCharacterField(db, member, community.id, { label: 'Trade', type: 'short_text', required: true })).rejects.toMatchObject({
      code: 'forbidden',
    });
    await expect(createCharacterField(db, owner, community.id, { label: 'Class', type: 'single_choice', required: true, options: ['Mage'] })).rejects.toMatchObject({
      code: 'invalid_input',
      fields: { options: 'Give at least two choices, one per line.' },
    });
    const trade = await createCharacterField(db, owner, community.id, { label: 'Trade', type: 'short_text', required: true });
    const extra = await createCharacterField(db, owner, community.id, { label: 'Nickname', type: 'short_text', required: false });
    expect([trade.position, extra.position]).toEqual([0, 1]);
    await removeCharacterField(db, owner, extra.id);
    expect((await listCharacterFields(db, community.id)).map((field) => field.label)).toEqual(['Trade']);

    await updateCommunity(db, owner, community.id, { ...settings, requireCharacterApproval: true });
    await updateRole(db, owner, (await listRoles(db, community.id)).find((role) => role.isDefault)!.id, {
      name: 'Member',
      permissions: ['character.submit', 'scene.create', 'scene.join'],
    });

    const original = await createCharacter(db, member, { name: 'Sarah' });
    const copy = await addCharacterToCommunity(db, member, original.id, community.id, { customValues: { [trade.id]: 'Baker' } });
    expect(copy.approvalStatus).toBe('pending');
    expect(await listCharactersForReview(db, community.id)).toMatchObject([{ name: 'Sarah', playerHandle: 'member', status: 'pending' }]);

    // Pending characters cannot open a private scene's worth of trouble in a community: they are not eligible.
    const opening = { title: 'Too soon', rating: 'everyone' as const, characterIds: [copy.id], openingPost: docFromText('Hello.') };
    await expect(createScene(db, member, opening)).rejects.toMatchObject({ code: 'invalid_input' });

    await expect(reviewCharacter(db, member, copy.id, 'approved')).rejects.toMatchObject({ code: 'forbidden', permission: 'character.approve' });
    await reviewCharacter(db, owner, copy.id, 'returned');
    expect(await listCharactersForReview(db, community.id)).toMatchObject([{ status: 'returned' }]);
    await reviewCharacter(db, owner, copy.id, 'approved');
    expect(await listCharactersForReview(db, community.id)).toEqual([]);
    expect((await getCharacterView(db, member, copy.id)).character.approvalStatus).toBe('approved');

    const actions = (await listAuditLog(db, owner, community.id)).map((row) => row.action);
    expect(actions).toEqual(expect.arrayContaining(['character.return', 'character.approve', 'characterfield.remove', 'role.assign', 'member.remove']));
  });
});
