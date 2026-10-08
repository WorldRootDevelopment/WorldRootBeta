import { auditLog, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { docFromText } from '@worldroot/editor';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCharacter } from '../characters/service';
import { assignRole, createManagedRole } from '../community/admin';
import { createCommunity, joinCommunity, type Community } from '../community/service';
import { createProfile } from '../identity/profile';
import { getSpace, sendMessage, startConversation } from '../messaging/service';
import type { Actor } from '../platform/authorize';
import { createScene, editPost, listPosts } from '../scenes/service';
import { countOpenReports, createReport, handleReport, listReports } from './reports';

let connection: DbConnection;
let owner: Actor;
let moderator: Actor;
let member: Actor;
let troll: Actor;
let staff: Actor;
let community: Community;

const addUser = async (handle: string, isStaff = false): Promise<Actor> => {
  const [user] = await connection.db
    .insert(users)
    .values({ name: handle, email: `${handle}@example.com`, platformRole: isStaff ? 'staff' : 'user' })
    .returning();
  const actor: Actor = { userId: user!.id, platformRole: isStaff ? 'staff' : 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

beforeAll(async () => {
  connection = await createTestDb();
  const { db } = connection;
  owner = await addUser('owner');
  moderator = await addUser('moderator');
  member = await addUser('member');
  troll = await addUser('troll');
  staff = await addUser('staffer', true);
  community = await createCommunity(db, owner, { slug: 'valley', name: 'Valley', listed: true });
  for (const person of [moderator, member, troll]) await joinCommunity(db, person, community.id);
  const role = await createManagedRole(db, owner, community.id, { name: 'Moderator', permissions: ['report.review', 'message.remove'] });
  await assignRole(db, owner, role.id, moderator.userId);
});

afterAll(async () => {
  await connection.close();
});

describe('reporting', () => {
  it('sends a community report to that community’s reviewers, with a snapshot that survives edits', async () => {
    const { db } = connection;
    const { conversation } = await getSpace(db, troll, community.id, 'lounge');
    const rude = await sendMessage(db, troll, conversation.id, 'Something rude about another writer.');

    await expect(createReport(db, member, { targetType: 'message', targetId: rude.id, category: 'nonsense' })).rejects.toMatchObject({
      code: 'invalid_input',
      fields: { category: 'Choose a reason.' },
    });
    await expect(createReport(db, troll, { targetType: 'message', targetId: rude.id, category: 'harassment' })).rejects.toMatchObject({
      code: 'invalid_input',
    });

    const report = await createReport(db, member, { targetType: 'message', targetId: rude.id, category: 'harassment', note: '  Aimed at me.  ' });
    expect(report).toMatchObject({ communityId: community.id, escalated: false, status: 'open', note: 'Aimed at me.', subjectUserId: troll.userId });
    // Reporting the same thing again while it is open does not pile up.
    expect((await createReport(db, member, { targetType: 'message', targetId: rude.id, category: 'spam' })).id).toBe(report.id);

    // Ordinary members cannot read the queue. The moderator can, and sees who reported.
    await expect(listReports(db, member, { communityId: community.id })).rejects.toMatchObject({ code: 'forbidden', permission: 'report.review' });
    expect(await countOpenReports(db, member, { communityId: community.id })).toBe(0);
    expect(await countOpenReports(db, moderator, { communityId: community.id })).toBe(1);
    const [row] = await listReports(db, moderator, { communityId: community.id });
    expect(row).toMatchObject({
      category: 'harassment',
      reporterHandle: 'member',
      subjectHandle: 'troll',
      snapshot: { text: 'Something rude about another writer.', where: 'Lounge of Valley', href: '/c/valley/lounge' },
    });
    // A community matter that was not escalated stays out of the platform queue.
    expect(await listReports(db, staff, 'platform')).toEqual([]);

    await expect(handleReport(db, member, report.id, { status: 'resolved' })).rejects.toMatchObject({ code: 'forbidden' });
    await expect(handleReport(db, moderator, report.id, { status: 'ignored' })).rejects.toMatchObject({ code: 'invalid_input' });
    await handleReport(db, moderator, report.id, { status: 'resolved', resolution: 'Message removed and member warned.' });
    expect(await listReports(db, moderator, { communityId: community.id })).toEqual([]);
    expect(await listReports(db, moderator, { communityId: community.id }, 'handled')).toMatchObject([
      { status: 'resolved', resolution: 'Message removed and member warned.' },
    ]);
    const [entry] = await db.select().from(auditLog).where(eq(auditLog.action, 'report.resolve'));
    expect(entry).toMatchObject({ actorUserId: moderator.userId, communityId: community.id });
  });

  it('keeps what a post said even if its author rewrites it afterwards', async () => {
    const { db } = connection;
    const original = await createCharacter(db, troll, { name: 'Edgelord' });
    const scene = await createScene(db, troll, { title: 'Bad Night', rating: 'everyone', characterIds: [original.id], openingPost: docFromText('The original nasty words.') });
    const [post] = (await listPosts(db, troll, scene.id, { stream: 'story' })).posts;

    // A private scene is invisible to non-participants, so they cannot report what is in it.
    await expect(createReport(db, member, { targetType: 'scene_post', targetId: post!.id, category: 'harassment' })).rejects.toMatchObject({
      code: 'not_found',
    });

    // Staff can see everything, and a report with no community goes to the platform queue.
    const report = await createReport(db, staff, { targetType: 'scene_post', targetId: post!.id, category: 'other' });
    expect(report).toMatchObject({ communityId: null, escalated: true });
    await editPost(db, troll, post!.id, docFromText('Something perfectly innocent.'));
    const [row] = await listReports(db, staff, 'platform');
    expect(row!.snapshot).toMatchObject({ text: 'The original nasty words.', href: `/scenes/${scene.id}#post-1` });
    expect(row!.snapshot.where).toContain('Bad Night');
  });

  it('routes possible harm, direct messages and profiles to WorldRoot staff', async () => {
    const { db } = connection;
    const { conversation } = await getSpace(db, troll, community.id, 'lounge');
    const threat = await sendMessage(db, troll, conversation.id, 'A threat.');
    const escalated = await createReport(db, member, { targetType: 'message', targetId: threat.id, category: 'threat' });
    expect(escalated).toMatchObject({ communityId: community.id, escalated: true });

    const dm = await startConversation(db, troll, { handles: ['member'] });
    const unwanted = await sendMessage(db, troll, dm.id, 'An unwanted message.');
    const direct = await createReport(db, member, { targetType: 'message', targetId: unwanted.id, category: 'harassment' });
    expect(direct).toMatchObject({ communityId: null, escalated: true });

    const profile = await createReport(db, member, { targetType: 'profile', targetId: troll.userId, category: 'impersonation' });
    expect(profile.snapshot).toMatchObject({ where: 'Profile of @troll', href: '/u/troll' });

    // The community's reviewers see the threat. They never see the private message or the profile report.
    const forModerator = await listReports(db, moderator, { communityId: community.id });
    expect(forModerator.map((row) => row.category)).toEqual(['threat']);
    await expect(listReports(db, moderator, 'platform')).rejects.toMatchObject({ code: 'forbidden' });

    const forStaff = await listReports(db, staff, 'platform');
    expect(forStaff.map((row) => row.category).sort()).toEqual(['harassment', 'impersonation', 'other', 'threat']);
    // A private message is described, not linked: reviewers work from the snapshot.
    expect(forStaff.find((row) => row.snapshot.text === 'An unwanted message.')!.snapshot).toMatchObject({ where: 'A direct message', href: null });

    // A moderator cannot close a report that has no community, and is told nothing about it.
    await expect(handleReport(db, moderator, direct.id, { status: 'dismissed' })).rejects.toMatchObject({ code: 'not_found' });
    await handleReport(db, staff, direct.id, { status: 'dismissed', resolution: 'No rule broken.' });
    expect(await countOpenReports(db, staff, 'platform')).toBe(3);

    // Someone outside the community cannot report its lounge messages if it is hidden from them.
    const outsider = await addUser('outsider');
    const hidden = await createCommunity(db, owner, { slug: 'hidden', name: 'Hidden', listed: false });
    const space = await getSpace(db, owner, hidden.id, 'lounge');
    const secret = await sendMessage(db, owner, space.conversation.id, 'Members only.');
    await expect(createReport(db, outsider, { targetType: 'message', targetId: secret.id, category: 'other' })).rejects.toMatchObject({ code: 'not_found' });
  });
});
