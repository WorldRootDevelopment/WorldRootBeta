import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCharacterToCommunity, createCharacter } from '../characters/service';
import { setCommunityArchived } from '../community/admin';
import { createCommunity } from '../community/service';
import type { Actor } from '../platform/authorize';
import { setPremium } from './badges';
import { getPlanUsage } from './plan';
import { createProfile } from './profile';
import { getProfileView, updateProfile } from './profile-view';

let connection: DbConnection;
let thea: Actor;
let marcus: Actor;
let staff: Actor;

const addUser = async (handle: string, platformRole: Actor['platformRole'] = 'user'): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com`, platformRole }).returning();
  const actor: Actor = { userId: user!.id, platformRole };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

beforeAll(async () => {
  connection = await createTestDb();
  thea = await addUser('thea');
  marcus = await addUser('marcus');
  staff = await addUser('warden', 'staff');
});

afterAll(async () => {
  await connection.close();
});

const full = { code: 'forbidden' };

describe('a free account', () => {
  it('keeps up to ten characters, and Heartwood lifts the limit without taking anything back when it ends', async () => {
    const { db } = connection;
    const community = await createCommunity(db, thea, { slug: 'harbour', name: 'Harbour Lights' });
    const made = [];
    for (let index = 1; index <= 10; index += 1) made.push(await createCharacter(db, thea, { name: `Character ${index}` }));
    // A community's copy of a character is the same character, so it uses up no room.
    await addCharacterToCommunity(db, thea, made[0]!.id, community.id, {});
    expect(await getPlanUsage(db, thea)).toMatchObject({ premium: false, characters: { used: 10, limit: 10 } });
    await expect(createCharacter(db, thea, { name: 'One Too Many' })).rejects.toMatchObject(full);
    // Someone else's library is their own.
    await createCharacter(db, marcus, { name: 'Marcus Hale' });

    await setPremium(db, staff, thea.userId, true);
    await createCharacter(db, thea, { name: 'Eleventh' });
    expect(await getPlanUsage(db, thea)).toMatchObject({ premium: true, characters: { used: 11, limit: null } });

    await setPremium(db, staff, thea.userId, false);
    expect((await getPlanUsage(db, thea)).characters).toEqual({ used: 11, limit: 10 });
    await expect(createCharacter(db, thea, { name: 'Twelfth' })).rejects.toMatchObject(full);
  });

  it('owns up to three communities, not counting archived ones', async () => {
    const { db } = connection;
    await createCommunity(db, marcus, { slug: 'one', name: 'One' });
    await createCommunity(db, marcus, { slug: 'two', name: 'Two' });
    const three = await createCommunity(db, marcus, { slug: 'three', name: 'Three' });
    await expect(createCommunity(db, marcus, { slug: 'four', name: 'Four' })).rejects.toMatchObject(full);

    await setCommunityArchived(db, marcus, three.id, true);
    await createCommunity(db, marcus, { slug: 'four', name: 'Four' });
    // Staff are never limited.
    for (const slug of ['staff-one', 'staff-two', 'staff-three', 'staff-four']) await createCommunity(db, staff, { slug, name: slug });
  });
});

describe('links on a profile', () => {
  it('come with Heartwood, point only where they say, and are hidden but kept when Heartwood ends', async () => {
    const { db } = connection;
    const details = { displayName: 'Marcus', hideOnline: false };
    const links = [
      { service: 'bluesky' as const, handle: '@marcus.bsky.social' },
      { service: 'furaffinity' as const, handle: 'marcus_hale' },
      { service: 'discord' as const, handle: 'marcus.hale' },
    ];
    await expect(updateProfile(db, marcus, { ...details, links })).rejects.toMatchObject(full);
    await expect(updateProfile(db, marcus, { ...details, website: 'https://marcus.example.com' })).rejects.toMatchObject(full);
    // Clearing is always allowed.
    await updateProfile(db, marcus, { ...details, links: [], website: '' });

    await setPremium(db, staff, marcus.userId, true);
    const saved = await updateProfile(db, marcus, { ...details, links, website: 'https://marcus.example.com/stories' });
    expect(saved.links).toEqual([
      { service: 'bluesky', label: 'Bluesky', handle: 'marcus.bsky.social', url: 'https://bsky.app/profile/marcus.bsky.social' },
      { service: 'furaffinity', label: 'Fur Affinity', handle: 'marcus_hale', url: 'https://www.furaffinity.net/user/marcus_hale/' },
      { service: 'discord', label: 'Discord', handle: 'marcus.hale', url: null },
    ]);
    expect(saved.website).toBe('https://marcus.example.com/stories');
    expect((await getProfileView(db, thea, 'marcus')).profile.links).toHaveLength(3);
    // A save that does not mention them leaves them alone.
    expect((await updateProfile(db, marcus, details)).links).toHaveLength(3);

    // A handle is a name on that site and nothing else; a website is a plain https address.
    const invalid = { code: 'invalid_input' };
    for (const handle of ['https://evil.example.com', 'marcus/../../x', 'a b', '']) {
      await expect(updateProfile(db, marcus, { ...details, links: [{ service: 'tumblr', handle }] })).rejects.toMatchObject(invalid);
    }
    await expect(updateProfile(db, marcus, { ...details, links: [{ service: 'myspace' as 'tumblr', handle: 'marcus' }] })).rejects.toMatchObject(invalid);
    await expect(updateProfile(db, marcus, { ...details, links: [links[0]!, links[0]!] })).rejects.toMatchObject(invalid);
    for (const website of ['http://marcus.example.com', 'javascript:alert(1)', 'https://user:pass@example.com', 'marcus.example.com']) {
      await expect(updateProfile(db, marcus, { ...details, website })).rejects.toMatchObject(invalid);
    }

    // Heartwood ends: nobody sees the links, but they come back if it returns.
    await setPremium(db, staff, marcus.userId, false);
    const hidden = (await getProfileView(db, thea, 'marcus')).profile;
    expect(hidden.links).toEqual([]);
    expect(hidden.website).toBeNull();
    await setPremium(db, staff, marcus.userId, true);
    expect((await getProfileView(db, thea, 'marcus')).profile.links).toHaveLength(3);
  });
});
