import { communityInvites, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { acceptInvite, banMember, createInvite, getInvitePreview, listBans, listInvites, revokeInvite, unbanMember } from './access';
import { listAuditLog, listMembers } from './admin';
import { createCommunity, getCommunityView, joinCommunity, type Community } from './service';

let connection: DbConnection;
let owner: Actor;
let hidden: Community;
let counter = 0;

const addUser = async (handle = `writer${(counter += 1)}`): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com` }).returning();
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

beforeAll(async () => {
  connection = await createTestDb();
  owner = await addUser('owner');
  hidden = await createCommunity(connection.db, owner, { slug: 'hidden-valley', name: 'Hidden Valley', listed: false });
});

afterAll(async () => {
  await connection.close();
});

describe('invite links', () => {
  it('let someone into an unlisted community that they otherwise cannot see or join', async () => {
    const { db } = connection;
    const guest = await addUser();
    await expect(getCommunityView(db, guest, 'hidden-valley')).rejects.toMatchObject({ code: 'not_found' });
    await expect(joinCommunity(db, guest, hidden.id)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(createInvite(db, guest, hidden.id)).rejects.toMatchObject({ code: 'forbidden', permission: 'community.invite' });

    const invite = await createInvite(db, owner, hidden.id);
    expect(invite.code).toMatch(/^[A-Za-z0-9_-]{12}$/);

    const preview = await getInvitePreview(db, guest, invite.code);
    expect(preview).toMatchObject({ usable: true, alreadyMember: false, community: { name: 'Hidden Valley', memberCount: 1 } });
    await expect(getInvitePreview(db, guest, 'not-a-real-code')).rejects.toMatchObject({ code: 'not_found' });

    expect(await acceptInvite(db, guest, invite.code)).toEqual({ slug: 'hidden-valley' });
    const view = await getCommunityView(db, guest, 'hidden-valley');
    expect(view.isMember).toBe(true);
    expect(view.permissions).toContain('scene.join');

    // Accepting twice changes nothing and does not spend another use.
    await acceptInvite(db, guest, invite.code);
    const [row] = await listInvites(db, owner, hidden.id);
    expect(row).toMatchObject({ uses: 1, state: 'active', createdByHandle: 'owner' });
  });

  it('stop working when used up, expired or revoked', async () => {
    const { db } = connection;
    const single = await createInvite(db, owner, hidden.id, { maxUses: 1 });
    await acceptInvite(db, await addUser(), single.code);
    const late = await addUser();
    await expect(acceptInvite(db, late, single.code)).rejects.toMatchObject({ code: 'conflict' });
    expect((await getInvitePreview(db, late, single.code)).usable).toBe(false);

    const dated = await createInvite(db, owner, hidden.id, { expiresInDays: 7 });
    expect(dated.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 6 * 86_400_000);
    await db.update(communityInvites).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(communityInvites.id, dated.id));
    await expect(acceptInvite(db, late, dated.code)).rejects.toMatchObject({ code: 'conflict' });

    const pulled = await createInvite(db, owner, hidden.id);
    await expect(revokeInvite(db, late, pulled.id)).rejects.toMatchObject({ code: 'forbidden' });
    await revokeInvite(db, owner, pulled.id);
    await expect(acceptInvite(db, late, pulled.code)).rejects.toMatchObject({ code: 'conflict' });

    const states = (await listInvites(db, owner, hidden.id)).map((row) => row.state);
    expect(states).toEqual(expect.arrayContaining(['used_up', 'expired', 'revoked', 'active']));
    await expect(createInvite(db, owner, hidden.id, { maxUses: 0 })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(createInvite(db, owner, hidden.id, { expiresInDays: 9999 })).rejects.toMatchObject({ code: 'invalid_input' });
  });
});

describe('bans', () => {
  it('remove a member and keep them out, whether by link or by a listed community’s Join button', async () => {
    const { db } = connection;
    const open = await createCommunity(db, owner, { slug: 'open-valley', name: 'Open Valley', listed: true });
    const troll = await addUser('troll');
    const bystander = await addUser('bystander');
    await joinCommunity(db, troll, open.id);
    await joinCommunity(db, bystander, open.id);

    await expect(banMember(db, bystander, open.id, troll.userId)).rejects.toMatchObject({ code: 'forbidden', permission: 'member.ban' });
    await expect(banMember(db, owner, open.id, owner.userId)).rejects.toMatchObject({ code: 'forbidden' });

    await banMember(db, owner, open.id, troll.userId, '  Spamming the lounge.  ');
    expect((await listMembers(db, open.id)).map((row) => row.handle)).toEqual(['owner', 'bystander']);
    expect(await listBans(db, owner, open.id)).toMatchObject([{ handle: 'troll', reason: 'Spamming the lounge.' }]);
    expect(await listBans(db, bystander, open.id)).toEqual([]);

    await expect(joinCommunity(db, troll, open.id)).rejects.toMatchObject({ code: 'forbidden' });
    const invite = await createInvite(db, owner, open.id);
    expect((await getInvitePreview(db, troll, invite.code)).usable).toBe(false);
    await expect(acceptInvite(db, troll, invite.code)).rejects.toMatchObject({ code: 'forbidden' });
    // The refused attempt did not spend a use: the whole acceptance rolled back.
    expect((await listInvites(db, owner, open.id))[0]!.uses).toBe(0);

    await unbanMember(db, owner, open.id, troll.userId);
    await joinCommunity(db, troll, open.id);
    expect((await getCommunityView(db, troll, 'open-valley')).isMember).toBe(true);

    const actions = (await listAuditLog(db, owner, open.id)).map((row) => row.action);
    expect(actions).toEqual(expect.arrayContaining(['member.ban', 'member.unban', 'invite.create']));
  });
});
