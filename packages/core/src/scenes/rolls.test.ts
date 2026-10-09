import { communities, locations, users, worlds, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { docFromText } from '@worldroot/editor';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCharacterToCommunity, createCharacter } from '../characters/service';
import { updateCommunity } from '../community/admin';
import { createCommunity, joinCommunity } from '../community/service';
import { createProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { copyWorldToCommunity, createWorld } from '../worlds/service';
import { diceWorking, parseDice, rollDice } from './dice';
import { rollInScene } from './rolls';
import { createScene, editPost, getSceneView, joinScene, listPosts, setSceneStatus } from './service';

describe('dice notation', () => {
  it('reads the usual forms and refuses the rest', () => {
    expect(parseDice('d20')).toEqual({ count: 1, sides: 20, modifier: 0 });
    expect(parseDice(' 2D6 + 3 ')).toEqual({ count: 2, sides: 6, modifier: 3 });
    expect(parseDice('1d100-5')).toEqual({ count: 1, sides: 100, modifier: -5 });
    for (const bad of ['', 'twenty', '2d', 'd1', '0d6', '21d6', 'd1001', '2d6+1001', '2d6+', '2d6; drop table', '1e3d6', null, 6]) {
      expect(() => parseDice(bad), String(bad)).toThrow();
    }
  });

  it('adds up, and shows its working only when there is some', () => {
    const fixed = [4, 5];
    const result = rollDice('2d6+3', () => fixed.shift()!);
    expect(result).toMatchObject({ notation: '2d6+3', rolls: [4, 5], total: 12 });
    expect(diceWorking(result)).toBe('4 + 5 + 3');
    expect(diceWorking(rollDice('d20', () => 17))).toBe('');
    expect(diceWorking(rollDice('d20-2', () => 17))).toBe('17 − 2');
    // Real rolls stay on the die.
    for (let i = 0; i < 200; i += 1) {
      const { rolls } = rollDice('3d4');
      expect(rolls.every((value) => value >= 1 && value <= 4 && Number.isInteger(value))).toBe(true);
    }
  });
});

describe('rolling in a scene', () => {
  let connection: DbConnection;
  const say = (text: string) => docFromText(text);
  const addUser = async (handle: string, displayName: string): Promise<Actor> => {
    const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com` }).returning();
    const actor: Actor = { userId: user!.id, platformRole: 'user' };
    await createProfile(connection.db, actor, { handle, displayName, adultConfirmed: true });
    return actor;
  };

  beforeAll(async () => {
    connection = await createTestDb();
  });
  afterAll(async () => {
    await connection.close();
  });

  it('needs DnD mode, a place in the scene and an open scene, and leaves an uneditable record', async () => {
    const { db } = connection;
    const owner = await addUser('owner', 'Olive');
    const player = await addUser('player', 'Marcus');
    const watcher = await addUser('watcher', 'Wren');
    const community = await createCommunity(db, owner, { slug: 'keep', name: 'The Keep', listed: true });
    await joinCommunity(db, player, community.id);
    await joinCommunity(db, watcher, community.id);
    const world = await copyWorldToCommunity(db, owner, (await createWorld(db, owner, { name: 'Realm' })).id, community.id);
    const [hall] = await db.insert(locations).values({ worldId: world.id, name: 'Great Hall' }).returning();
    expect((await db.select().from(worlds).where(eq(worlds.id, world.id)))[0]!.ownerCommunityId).toBe(community.id);

    const gm = await addCharacterToCommunity(db, owner, (await createCharacter(db, owner, { name: 'Game Master' })).id, community.id);
    const hale = await addCharacterToCommunity(db, player, (await createCharacter(db, player, { name: 'Hale' })).id, community.id);
    const scene = await createScene(db, owner, { title: 'The Vault', rating: 'teen', locationId: hall!.id, characterIds: [gm.id], openingPost: say('A locked door.') });
    await joinScene(db, player, scene.id, [hale.id]);

    // Off by default.
    expect((await getSceneView(db, player, scene.id)).dice).toBe(false);
    await expect(rollInScene(db, player, scene.id, { notation: 'd20' })).rejects.toMatchObject({ code: 'forbidden' });

    const settings = { name: 'The Keep', accentHue: 30, listed: true, requireCharacterApproval: false };
    await updateCommunity(db, owner, community.id, { ...settings, dndMode: true });
    // Saving settings without the switch leaves it as it was.
    await updateCommunity(db, owner, community.id, settings);
    expect((await db.select().from(communities).where(eq(communities.id, community.id)))[0]!.dndMode).toBe(true);
    expect((await getSceneView(db, player, scene.id)).dice).toBe(true);

    const fixed = [4, 5];
    const { post, result } = await rollInScene(db, player, scene.id, { notation: '2d6+3', characterId: hale.id, reason: '  to pick   the lock ' }, () => fixed.shift()!);
    expect(result.total).toBe(12);
    expect(post).toMatchObject({ kind: 'system', seq: 2, characterName: 'Hale', contentText: 'Hale rolled 2d6+3 to pick the lock: 4 + 5 + 3 = 12' });
    expect(post.contentHtml).toBe('<p>Hale rolled 2d6+3 to pick the lock: 4 + 5 + 3 = <strong>12</strong></p>');
    // It sits in the story, does not count as a story post, and its roller cannot rewrite it.
    const story = await listPosts(db, watcher, scene.id, { stream: 'story' });
    expect(story.posts.map((row) => row.kind)).toEqual(['ic', 'system']);
    expect((await getSceneView(db, player, scene.id)).scene.icPostCount).toBe(1);
    await expect(editPost(db, player, post.id, say('Hale rolled 2d6+3: 6 + 6 + 3 = 15'))).rejects.toMatchObject({ code: 'forbidden' });

    // As yourself, with no working to show for a single die.
    const plain = await rollInScene(db, player, scene.id, { notation: 'D20' }, () => 17);
    expect(plain.post.contentText).toBe('Marcus rolled 1d20: 17');

    // Not as someone else's character, not without joining, not with nonsense, not once the scene is closed.
    await expect(rollInScene(db, player, scene.id, { notation: 'd20', characterId: gm.id })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(rollInScene(db, watcher, scene.id, { notation: 'd20' })).rejects.toMatchObject({ code: 'forbidden' });
    await expect(rollInScene(db, player, scene.id, { notation: '99d99999' })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(rollInScene(db, player, scene.id, { notation: 'd20', reason: 'x'.repeat(121) })).rejects.toMatchObject({ code: 'invalid_input' });
    await setSceneStatus(db, owner, scene.id, 'completed');
    await expect(rollInScene(db, player, scene.id, { notation: 'd20' })).rejects.toMatchObject({ code: 'conflict' });

    // A private scene belongs to no community, so it has no dice.
    const own = await createCharacter(db, owner, { name: 'Loner' });
    const privateScene = await createScene(db, owner, { title: 'Alone', rating: 'teen', characterIds: [own.id], openingPost: say('Quiet.') });
    await expect(rollInScene(db, owner, privateScene.id, { notation: 'd20' })).rejects.toMatchObject({ code: 'forbidden' });
  });
});
