import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCharacterToCommunity, createCharacter } from '../characters/service';
import { setCommunityArchived, updateCommunity } from '../community/admin';
import { listMemberPresence, touchPresence } from '../community/presence';
import { createCommunity, joinCommunity } from '../community/service';
import type { Actor } from '../platform/authorize';
import { createProfile } from './profile';
import { getOwnProfileSettings, getProfileView, updateProfile } from './profile-view';

let connection: DbConnection;
let thea: Actor;
let marcus: Actor;
let stranger: Actor;

const addUser = async (handle: string): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com` }).returning();
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true });
  return actor;
};

beforeAll(async () => {
  connection = await createTestDb();
  thea = await addUser('Thea');
  marcus = await addUser('marcus');
  stranger = await addUser('stranger');
});

afterAll(async () => {
  await connection.close();
});

describe('editing your profile', () => {
  it('changes your own details and nobody else’s', async () => {
    const { db } = connection;
    const updated = await updateProfile(db, thea, { displayName: '  Thea Bunn ', pronouns: 'she/her', bio: 'Writes late.\nReads later.', hideOnline: false });
    expect(updated).toMatchObject({ handle: 'Thea', displayName: 'Thea Bunn', pronouns: 'she/her', bio: 'Writes late.\nReads later.' });

    // Empty optional fields are stored as nothing, not as blank text.
    expect(await updateProfile(db, thea, { displayName: 'Thea Bunn', pronouns: '  ', bio: '', hideOnline: false })).toMatchObject({
      pronouns: null,
      bio: null,
    });
    await expect(updateProfile(db, thea, { displayName: ' ', hideOnline: false })).rejects.toMatchObject({
      code: 'invalid_input',
      fields: { displayName: 'Enter a display name.' },
    });
    expect((await getProfileView(db, thea, 'marcus')).profile.displayName).toBe('marcus');
  });
});

describe('a public profile', () => {
  it('is found by handle in any case, and shows only what the viewer could already see', async () => {
    const { db } = connection;
    const open = await createCommunity(db, thea, { slug: 'open-valley', name: 'Open Valley', listed: true });
    const hidden = await createCommunity(db, thea, { slug: 'hidden-valley', name: 'Hidden Valley', listed: false });
    const inOpen = await createCharacter(db, thea, { name: 'Captain Thea', tagline: 'Always early.' });
    const inHidden = await createCharacter(db, thea, { name: 'Secret Thea' });
    await createCharacter(db, thea, { name: 'Library Only' });
    await addCharacterToCommunity(db, thea, inOpen.id, open.id);
    await addCharacterToCommunity(db, thea, inHidden.id, hidden.id);

    const own = await getProfileView(db, thea, '@thea');
    expect(own).toMatchObject({ isSelf: true });
    expect(own.communities.map((c) => c.name)).toEqual(['Hidden Valley', 'Open Valley']);
    // Library originals are private, even on your own public page.
    expect(own.characters.map((c) => c.name)).toEqual(['Captain Thea', 'Secret Thea']);

    // A stranger sees the listed community and the character in it, and nothing of the unlisted one.
    const seen = await getProfileView(db, stranger, 'THEA');
    expect(seen.isSelf).toBe(false);
    expect(seen.communities.map((c) => c.slug)).toEqual(['open-valley']);
    expect(seen.characters).toEqual([
      { id: expect.any(String), name: 'Captain Thea', tagline: 'Always early.', communityName: 'Open Valley', communitySlug: 'open-valley' },
    ]);

    await expect(getProfileView(db, stranger, 'nobody')).rejects.toMatchObject({ code: 'not_found' });

    // Archiving hides a community from outsiders here too, and review holds a pending character back.
    await setCommunityArchived(db, thea, open.id, true);
    expect((await getProfileView(db, stranger, 'thea')).communities).toEqual([]);
    await setCommunityArchived(db, thea, open.id, false);

    await updateCommunity(db, thea, open.id, { name: 'Open Valley', accentHue: 155, listed: true, requireCharacterApproval: true });
    await joinCommunity(db, marcus, open.id);
    const pending = await createCharacter(db, marcus, { name: 'Marcus Hale' });
    await addCharacterToCommunity(db, marcus, pending.id, open.id);
    expect((await getProfileView(db, stranger, 'marcus')).characters).toEqual([]);
  });
});

describe('appearing offline', () => {
  it('keeps you out of the online list without stopping your check-ins', async () => {
    const { db } = connection;
    const community = await createCommunity(db, thea, { slug: 'presence-valley', name: 'Presence Valley', listed: true });
    await joinCommunity(db, marcus, community.id);
    await touchPresence(db, thea);
    await touchPresence(db, marcus);
    const online = async () => (await listMemberPresence(db, community.id)).filter((row) => row.online).map((row) => row.handle);
    expect((await online()).sort()).toEqual(['Thea', 'marcus']);

    await updateProfile(db, marcus, { displayName: 'marcus', hideOnline: true });
    expect(await getOwnProfileSettings(db, marcus)).toMatchObject({ hideOnline: true });
    expect(await online()).toEqual(['Thea']);

    await updateProfile(db, marcus, { displayName: 'marcus', hideOnline: false });
    expect((await online()).sort()).toEqual(['Thea', 'marcus']);
  });
});
