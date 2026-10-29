import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCommunity } from '../community/service';
import { createProfile, getProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { addRelationship, listRelationships, listSharedCharacters, removeRelationship, setCharacterNotes, setCharacterShared } from './keeping';
import { addCharacterToCommunity, createCharacter, getCharacterView, setCharacterTags } from './service';

let connection: DbConnection;
let thea: Actor;
let reader: Actor;

const addUser = async (handle: string, intent?: 'write' | 'keep'): Promise<Actor> => {
  const [user] = await connection.db.insert(users).values({ name: handle, email: `${handle}@example.com` }).returning();
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, actor, { handle, displayName: handle, adultConfirmed: true, intent });
  return actor;
};

beforeAll(async () => {
  connection = await createTestDb();
  thea = await addUser('thea', 'keep');
  reader = await addUser('reader');
});

afterAll(async () => {
  await connection.close();
});

const gone = { code: 'not_found' };

describe('keeping characters', () => {
  it('remembers what someone came for', async () => {
    expect((await getProfile(connection.db, thea.userId))?.intent).toBe('keep');
    expect((await getProfile(connection.db, reader.userId))?.intent).toBeNull();
  });

  it('shares a library character with everyone signed in, without its tags or notes', async () => {
    const { db } = connection;
    const captain = await createCharacter(db, thea, { name: 'Captain Thea' });
    await setCharacterTags(db, thea, captain.id, ['Main Cast']);
    await setCharacterNotes(db, thea, captain.id, '  Secretly afraid of trains.  ');

    await expect(getCharacterView(db, reader, captain.id)).rejects.toMatchObject(gone);
    await expect(setCharacterShared(db, reader, captain.id, true)).rejects.toMatchObject(gone);
    await setCharacterShared(db, thea, captain.id, true);

    const seen = await getCharacterView(db, reader, captain.id);
    expect(seen).toMatchObject({ canEdit: false, character: { name: 'Captain Thea', privateNotes: null, tags: [] } });
    expect((await getCharacterView(db, thea, captain.id)).character).toMatchObject({ privateNotes: 'Secretly afraid of trains.', tags: ['Main Cast'] });
    expect((await listSharedCharacters(db, thea.userId)).map((character) => character.name)).toEqual(['Captain Thea']);

    // A community's copy leaves the sharing, notes and tags behind.
    const community = await createCommunity(db, thea, { slug: 'harbour', name: 'Harbour Lights' });
    const copy = await addCharacterToCommunity(db, thea, captain.id, community.id, {});
    expect(copy).toMatchObject({ shared: false, privateNotes: null, tags: [] });

    await setCharacterShared(db, thea, captain.id, false);
    await expect(getCharacterView(db, reader, captain.id)).rejects.toMatchObject(gone);
    await expect(setCharacterNotes(db, thea, captain.id, 'x'.repeat(10_001))).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('relates two of one person’s characters, shown on both, and never names a private one to others', async () => {
    const { db } = connection;
    const sister = await createCharacter(db, thea, { name: 'Sister Vell' });
    const brother = await createCharacter(db, thea, { name: 'Brother Oren' });
    const stranger = await createCharacter(db, reader, { name: 'Somebody Else' });

    await expect(addRelationship(db, thea, sister.id, stranger.id, 'Friends')).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(addRelationship(db, thea, sister.id, sister.id, 'Self')).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(addRelationship(db, thea, sister.id, brother.id, '')).rejects.toMatchObject({ code: 'invalid_input' });

    const made = await addRelationship(db, thea, sister.id, brother.id, 'Siblings');
    // Saying it again from the other side renames the same one.
    await addRelationship(db, thea, brother.id, sister.id, 'Feuding Siblings');
    expect(await listRelationships(db, thea, sister.id)).toEqual([{ id: made.id, other: { id: brother.id, name: 'Brother Oren' }, label: 'Feuding Siblings' }]);
    expect(await listRelationships(db, thea, brother.id)).toEqual([{ id: made.id, other: { id: sister.id, name: 'Sister Vell' }, label: 'Feuding Siblings' }]);

    await setCharacterShared(db, thea, sister.id, true);
    expect(await listRelationships(db, reader, sister.id)).toEqual([]);
    await setCharacterShared(db, thea, brother.id, true);
    expect(await listRelationships(db, reader, sister.id)).toHaveLength(1);

    await removeRelationship(db, reader, made.id).catch(() => null);
    expect(await listRelationships(db, thea, sister.id)).toHaveLength(1);
    await removeRelationship(db, thea, made.id);
    expect(await listRelationships(db, thea, sister.id)).toEqual([]);
  });
});
