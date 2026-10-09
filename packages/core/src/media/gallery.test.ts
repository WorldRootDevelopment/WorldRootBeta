import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCharacterToCommunity, createCharacter } from '../characters/service';
import { createCommunity } from '../community/service';
import { setPremium } from '../identity/badges';
import { createProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { addCharacterImage, getCharacterGallery, readMedia, removeCharacterImage } from './service';
import { memoryStorage } from './storage';

const text = (value: string) => [...value].map((char) => char.charCodeAt(0));
const be32 = (value: number) => [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
const pngChunk = (type: string, data: number[]) => [...be32(data.length), ...text(type), ...data, 0, 0, 0, 0];
const png = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...pngChunk('IHDR', [...be32(4), ...be32(4), 8, 6, 0, 0, 0]), ...pngChunk('IDAT', [1, 2, 3, 4]), ...pngChunk('IEND', [])]);
const gif = () => new Uint8Array([...text('GIF89a'), 4, 0, 4, 0, 0, 0, 0, 0x3b]);

let connection: DbConnection;
let thea: Actor;
let marcus: Actor;
let staff: Actor;
const storage = memoryStorage();

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

describe('a character’s gallery', () => {
  it('holds one picture on a free account and ten with Heartwood, and keeps them when Heartwood ends', async () => {
    const { db } = connection;
    const captain = await createCharacter(db, thea, { name: 'Captain Thea' });
    expect(await getCharacterGallery(db, captain)).toEqual({ images: [], limit: 1 });

    // Only someone who may edit the character, and no animation for now.
    await expect(addCharacterImage(db, storage, marcus, captain.id, png())).rejects.toMatchObject({ code: 'not_found' });
    await expect(addCharacterImage(db, storage, thea, captain.id, gif())).rejects.toMatchObject({ code: 'invalid_input' });

    const first = await addCharacterImage(db, storage, thea, captain.id, png());
    await expect(addCharacterImage(db, storage, thea, captain.id, png())).rejects.toMatchObject({ code: 'forbidden' });
    expect((await getCharacterGallery(db, captain)).images).toEqual([first.id]);

    await setPremium(db, staff, thea.userId, true);
    const more = [];
    for (let index = 0; index < 9; index += 1) more.push(await addCharacterImage(db, storage, thea, captain.id, png()));
    await expect(addCharacterImage(db, storage, thea, captain.id, png())).rejects.toMatchObject({ code: 'forbidden' });
    expect(await getCharacterGallery(db, captain)).toEqual({ images: [first.id, ...more.map((image) => image.id)], limit: 10 });

    await setPremium(db, staff, thea.userId, false);
    const after = await getCharacterGallery(db, captain);
    expect(after.images).toHaveLength(10);
    expect(after.limit).toBe(1);
    await expect(addCharacterImage(db, storage, thea, captain.id, png())).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('is copied with the character into a community, and a picture survives until neither shows it', async () => {
    const { db } = connection;
    const community = await createCommunity(db, marcus, { slug: 'harbour', name: 'Harbour Lights' });
    const hale = await createCharacter(db, marcus, { name: 'Marcus Hale' });
    const picture = await addCharacterImage(db, storage, marcus, hale.id, png());
    const copy = await addCharacterToCommunity(db, marcus, hale.id, community.id, {});
    expect((await getCharacterGallery(db, copy)).images).toEqual([picture.id]);

    // Taken out of the original: the copy still shows it, so the image is kept.
    await removeCharacterImage(db, storage, marcus, hale.id, picture.id);
    expect((await getCharacterGallery(db, hale)).images).toEqual([]);
    expect((await readMedia(db, storage, picture.id)).contentType).toBe('image/png');

    // Taken out of the copy too: now nothing shows it and it is gone.
    await removeCharacterImage(db, storage, marcus, copy.id, picture.id);
    await expect(readMedia(db, storage, picture.id)).rejects.toMatchObject({ code: 'not_found' });
    // Removing what is not there changes nothing.
    await removeCharacterImage(db, storage, marcus, copy.id, picture.id);
  });
});
