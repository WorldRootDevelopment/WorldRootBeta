import { auditLog, locations, scenePostRevisions, users, worlds, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { docFromText } from '@worldroot/editor';
import { and, eq, isNotNull } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCharacterToCommunity, createCharacter, listCommunityCharacters } from '../characters/service';
import { getCommunityView, joinCommunity, listCharacterFields } from '../community/service';
import { DEMO_ACCOUNT, DEMO_COMMUNITY_SLUG, seedDemo } from '../demo/demo-town';
import { createProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import {
  createPost,
  createScene,
  editPost,
  getSceneView,
  inviteToScene,
  joinScene,
  listLocationScenes,
  listMyScenes,
  listPosts,
  markSceneRead,
  removePost,
  saveDraft,
  setSceneStatus,
} from './service';

let connection: DbConnection;
let thea: Actor;
let marcus: Actor;
let outsider: Actor;

const addUser = async (handle: string): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com` }).returning();
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

const say = (text: string) => docFromText(text);

beforeAll(async () => {
  connection = await createTestDb();
  await seedDemo(connection.db);
  thea = await addUser('thea');
  marcus = await addUser('marcus');
  outsider = await addUser('outsider');
});

afterAll(async () => {
  await connection.close();
});

describe('a private scene', () => {
  it('runs from opening post to completion between two invited writers', async () => {
    const { db } = connection;
    const captain = await createCharacter(db, thea, { name: 'Captain Thea' });
    const sarah = await createCharacter(db, thea, { name: 'Sarah' });
    const hale = await createCharacter(db, marcus, { name: 'Marcus Hale' });

    const scene = await createScene(db, thea, {
      title: 'The Late Train',
      rating: 'teen',
      characterIds: [captain.id, sarah.id],
      openingPost: say('The 11:40 was late again.\n\nShe checked her watch.'),
    });
    expect(scene).toMatchObject({ communityId: null, locationId: null, status: 'active', lastSeq: 1, icPostCount: 1, lastIcSeq: 1 });

    // Invisible until invited.
    await expect(getSceneView(db, marcus, scene.id)).rejects.toMatchObject({ code: 'not_found' });
    await expect(joinScene(db, marcus, scene.id, [hale.id])).rejects.toMatchObject({ code: 'not_found' });

    await expect(inviteToScene(db, thea, scene.id, 'nobody_here')).rejects.toMatchObject({ code: 'not_found' });
    await inviteToScene(db, thea, scene.id, '@Marcus');

    // Invited: can read, has not brought a character yet, so can narrate or speak OOC but not as someone else's character.
    const invited = await getSceneView(db, marcus, scene.id);
    expect(invited.viewer).toMatchObject({ isParticipant: true, canManage: false, characters: [] });
    expect(invited.viewer.canBring.map((c) => c.name)).toEqual(['Marcus Hale']);
    await expect(createPost(db, marcus, scene.id, { kind: 'ic', characterId: captain.id, content: say('Stolen voice.') })).rejects.toMatchObject({
      code: 'invalid_input',
    });
    await expect(joinScene(db, marcus, scene.id, [captain.id])).rejects.toMatchObject({ code: 'invalid_input' });

    await joinScene(db, marcus, scene.id, [hale.id]);
    const reply = await createPost(db, marcus, scene.id, { kind: 'ic', characterId: hale.id, content: say('He had saved her a seat.') });
    expect(reply).toMatchObject({ seq: 2, kind: 'ic', characterName: 'Marcus Hale', contentHtml: '<p>He had saved her a seat.</p>' });

    // OOC and narration share the sequence but only IC moves the story counters.
    await createPost(db, thea, scene.id, { kind: 'ooc', content: say('brb, ten minutes') });
    const narration = await createPost(db, thea, scene.id, { kind: 'ic', characterId: null, content: say('The train pulled out.') });
    expect(narration).toMatchObject({ seq: 4, characterId: null, characterName: null });

    const story = await listPosts(db, thea, scene.id, { stream: 'story' });
    const ooc = await listPosts(db, thea, scene.id, { stream: 'ooc' });
    expect(story.posts.map((p) => p.seq)).toEqual([1, 2, 4]);
    expect(story.posts[0]).toMatchObject({ characterName: 'Captain Thea', authorHandle: 'thea' });
    expect(ooc.posts.map((p) => p.contentText)).toEqual(['brb, ten minutes']);

    // Waiting on Marcus: the latest IC post is Thea's.
    const [forMarcus] = await listMyScenes(db, marcus.userId);
    expect(forMarcus).toMatchObject({ waitingOnYou: true, unread: 2, cast: ['Captain Thea', 'Sarah', 'Marcus Hale'] });
    const [forThea] = await listMyScenes(db, thea.userId);
    expect(forThea).toMatchObject({ waitingOnYou: false, unread: 0 });

    await markSceneRead(db, marcus, scene.id, 999);
    await markSceneRead(db, marcus, scene.id, 1);
    expect((await listMyScenes(db, marcus.userId))[0]!.unread).toBe(0);

    // Only the creator closes it. Once completed, the story is closed and OOC stays open.
    await expect(setSceneStatus(db, marcus, scene.id, 'completed')).rejects.toMatchObject({ code: 'forbidden' });
    await setSceneStatus(db, thea, scene.id, 'completed');
    await expect(createPost(db, marcus, scene.id, { kind: 'ic', characterId: hale.id, content: say('One more.') })).rejects.toMatchObject({
      code: 'conflict',
    });
    await expect(createPost(db, marcus, scene.id, { kind: 'ooc', content: say('That was lovely.') })).resolves.toMatchObject({ kind: 'ooc' });
    expect((await getSceneView(db, marcus, scene.id)).viewer.canPost).toBe(false);

    await expect(listPosts(db, outsider, scene.id, { stream: 'story' })).rejects.toMatchObject({ code: 'not_found' });
  });

  it('refuses empty, malformed and oversized posts', async () => {
    const { db } = connection;
    const character = await createCharacter(db, thea, { name: 'Quiet One' });
    const base = { title: 'Drafting', rating: 'everyone' as const, characterIds: [character.id] };

    await expect(createScene(db, thea, { ...base, openingPost: say('   ') })).rejects.toMatchObject({ fields: { content: 'Write something first.' } });
    await expect(createScene(db, thea, { ...base, openingPost: '<p>raw html</p>' })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(createScene(db, thea, { ...base, characterIds: [], openingPost: say('Hi') })).rejects.toMatchObject({
      fields: { characterIds: 'Choose at least one character.' },
    });
    await expect(createScene(db, thea, { ...base, title: ' ', openingPost: say('Hi') })).rejects.toMatchObject({
      fields: { title: 'Give the scene a title.' },
    });

    const scene = await createScene(db, thea, { ...base, openingPost: say('Hi') });
    await expect(createPost(db, thea, scene.id, { kind: 'ooc', content: say('x'.repeat(2_001)) })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      createPost(db, thea, scene.id, {
        kind: 'ic',
        characterId: character.id,
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '<script>alert(1)</script>' }] }] },
      }),
    ).resolves.toMatchObject({ contentHtml: '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>' });
  });

  it('keeps one draft per writer and clears it on posting', async () => {
    const { db } = connection;
    const character = await createCharacter(db, thea, { name: 'Drafter' });
    const scene = await createScene(db, thea, { title: 'Drafts', rating: 'everyone', characterIds: [character.id], openingPost: say('Start.') });

    await saveDraft(db, thea, scene.id, { characterId: character.id, content: say('Half a thou') });
    await saveDraft(db, thea, scene.id, { characterId: character.id, content: say('Half a thought, finished.') });
    const view = await getSceneView(db, thea, scene.id);
    expect(view.viewer.draft).toMatchObject({ characterId: character.id });
    expect(JSON.stringify(view.viewer.draft!.content)).toContain('finished');

    await saveDraft(db, thea, scene.id, { content: say('') });
    expect((await getSceneView(db, thea, scene.id)).viewer.draft).toBeNull();

    await saveDraft(db, thea, scene.id, { characterId: character.id, content: say('About to post') });
    await createPost(db, thea, scene.id, { kind: 'ic', characterId: character.id, content: say('Posted.') });
    expect((await getSceneView(db, thea, scene.id)).viewer.draft).toBeNull();
    await expect(saveDraft(db, outsider, scene.id, { content: say('sneaky') })).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('editing and removing posts', () => {
  it('lets an author edit and remove their own post, keeping what it said before', async () => {
    const { db } = connection;
    const mine = await createCharacter(db, thea, { name: 'Editor' });
    const theirs = await createCharacter(db, marcus, { name: 'Reader' });
    const scene = await createScene(db, thea, { title: 'Second thoughts', rating: 'everyone', characterIds: [mine.id], openingPost: say('Frist draft.') });
    await inviteToScene(db, thea, scene.id, 'marcus');
    await joinScene(db, marcus, scene.id, [theirs.id]);
    const reply = await createPost(db, marcus, scene.id, { kind: 'ic', characterId: theirs.id, content: say('A reply.') });
    const [opening] = (await listPosts(db, thea, scene.id, { stream: 'story' })).posts;

    const edited = await editPost(db, thea, opening!.id, say('First draft.'));
    expect(edited).toMatchObject({ contentHtml: '<p>First draft.</p>', seq: 1 });
    expect(edited.editedAt).not.toBeNull();
    const revisions = await db.select().from(scenePostRevisions).where(eq(scenePostRevisions.postId, opening!.id));
    expect(revisions).toHaveLength(1);
    expect(JSON.stringify(revisions[0]!.contentJson)).toContain('Frist');

    await expect(editPost(db, thea, opening!.id, say('  '))).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(editPost(db, marcus, opening!.id, say('Hijacked.'))).rejects.toMatchObject({ code: 'forbidden' });
    // In a private scene there are no moderators: not even the scene's creator removes another writer's post.
    await expect(removePost(db, thea, reply.id)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(removePost(db, outsider, reply.id)).rejects.toMatchObject({ code: 'not_found' });

    await removePost(db, marcus, reply.id);
    await removePost(db, marcus, reply.id);
    const page = await listPosts(db, thea, scene.id, { stream: 'story' });
    expect(page.viewerCanModerate).toBe(false);
    expect(page.posts.map((p) => p.seq)).toEqual([1, 2]);
    expect(page.posts[0]).toMatchObject({ mine: true, removedBy: null });
    // The removed post keeps its place and its words are withheld.
    expect(page.posts[1]).toMatchObject({ mine: false, removedBy: 'author', contentHtml: '', contentText: '' });
    await expect(editPost(db, marcus, reply.id, say('Back again.'))).rejects.toMatchObject({ code: 'conflict' });
  });

  it('lets a community moderator remove a post, and records it', async () => {
    const { db } = connection;
    const [owner] = await db.select().from(users).where(eq(users.email, DEMO_ACCOUNT.email));
    const gm: Actor = { userId: owner!.id, platformRole: 'user' };
    const { community } = await getCommunityView(db, gm, DEMO_COMMUNITY_SLUG);
    const [hall] = await db
      .select({ id: locations.id })
      .from(locations)
      .innerJoin(worlds, eq(worlds.id, locations.worldId))
      .where(and(eq(locations.name, 'Town Hall'), isNotNull(worlds.ownerCommunityId)));

    const member = await addUser('ensign');
    await joinCommunity(db, member, community.id);
    const fields = await listCharacterFields(db, community.id);
    const original = await createCharacter(db, member, { name: 'Local Trouble' });
    const copy = await addCharacterToCommunity(db, member, original.id, community.id, {
      customValues: Object.fromEntries(fields.map((field) => [field.id, field.options?.[1] ?? 'Odd-job hand'])),
    });
    const scene = await createScene(db, member, {
      title: 'Out of Order',
      rating: 'everyone',
      locationId: hall!.id,
      characterIds: [copy.id],
      openingPost: say('Something the rules do not allow.'),
    });
    const [post] = (await listPosts(db, member, scene.id, { stream: 'story' })).posts;

    // Another ordinary member cannot remove it. The owner can.
    await expect(removePost(db, thea, post!.id)).rejects.toMatchObject({ code: 'forbidden', permission: 'post.remove' });
    expect((await listPosts(db, gm, scene.id, { stream: 'story' })).viewerCanModerate).toBe(true);
    await removePost(db, gm, post!.id);

    const [seen] = (await listPosts(db, member, scene.id, { stream: 'story' })).posts;
    expect(seen).toMatchObject({ removedBy: 'moderator', contentText: '' });
    const [entry] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, 'post.remove'), eq(auditLog.targetId, post!.id)));
    expect(entry).toMatchObject({ actorUserId: gm.userId, communityId: community.id });
  });
});

describe('a community scene', () => {
  it('is set in a location, open to members with approved characters, and audited', async () => {
    const { db } = connection;
    const [owner] = await db.select().from(users).where(eq(users.email, DEMO_ACCOUNT.email));
    const gm: Actor = { userId: owner!.id, platformRole: 'user' };
    const { community } = await getCommunityView(db, gm, DEMO_COMMUNITY_SLUG);
    const [square] = await db
      .select({ id: locations.id })
      .from(locations)
      .innerJoin(worlds, eq(worlds.id, locations.worldId))
      .where(and(eq(locations.name, 'Town Square'), isNotNull(worlds.ownerCommunityId)));
    const crew = await listCommunityCharacters(db, community.id);
    const narrator = crew.find((c) => c.name === 'Narrator')!;

    const scene = await createScene(db, gm, {
      title: 'Market Day',
      description: 'The square fills up with stalls.',
      rating: 'teen',
      locationId: square!.id,
      characterIds: [narrator.id],
      openingPost: say('The first stall went up before the clock struck seven.'),
    });
    expect(scene).toMatchObject({ communityId: community.id, locationId: square!.id });
    expect((await listLocationScenes(db, square!.id)).map((s) => s.scene.title)).toContain('Market Day');

    // A library original cannot be used in a community scene, and a non-member cannot start one.
    const loose = await createCharacter(db, thea, { name: 'Passing Stranger' });
    const draft = { title: 'Rival Market', rating: 'teen' as const, locationId: square!.id, openingPost: say('Hm.') };
    await expect(createScene(db, thea, { ...draft, characterIds: [loose.id] })).rejects.toMatchObject({
      code: 'forbidden',
      permission: 'scene.create',
    });

    // Anyone who can see the community can read. Joining needs membership and an approved community character.
    const reading = await getSceneView(db, thea, scene.id);
    expect(reading.place).toMatchObject({ community: { slug: DEMO_COMMUNITY_SLUG }, location: { name: 'Town Square' }, world: { name: 'Demo Town' } });
    expect(reading.viewer).toMatchObject({ isParticipant: false, canPost: false, canBring: [] });
    await expect(joinScene(db, thea, scene.id, [loose.id])).rejects.toMatchObject({ code: 'forbidden', permission: 'scene.join' });

    await joinCommunity(db, thea, community.id);
    await expect(joinScene(db, thea, scene.id, [loose.id])).rejects.toMatchObject({ code: 'invalid_input' });
    const fields = await listCharacterFields(db, community.id);
    const aboard = await addCharacterToCommunity(db, thea, loose.id, community.id, {
      customValues: Object.fromEntries(fields.map((field) => [field.id, field.options?.[1] ?? 'Newcomer'])),
    });
    await joinScene(db, thea, scene.id, [aboard.id]);
    await expect(createPost(db, thea, scene.id, { kind: 'ic', characterId: aboard.id, content: say('"Is this where the market is?"') })).resolves.toMatchObject({
      seq: 2,
      characterName: 'Passing Stranger',
    });

    // A member cannot close someone else's scene. The creator can, and it is recorded.
    await expect(setSceneStatus(db, thea, scene.id, 'on_hold')).rejects.toMatchObject({ code: 'forbidden' });
    await setSceneStatus(db, gm, scene.id, 'on_hold');
    const [entry] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, 'scene.status'), eq(auditLog.targetId, scene.id)));
    expect(entry).toMatchObject({ communityId: community.id, before: { status: 'active' }, after: { status: 'on_hold' } });
  });
});
