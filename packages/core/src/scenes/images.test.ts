import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { docFromText, EMPTY_DOC } from '@worldroot/editor';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCharacter } from '../characters/service';
import { createProfile } from '../identity/profile';
import { setDiceTheme } from '../identity/profile-view';
import { readMedia, removeAvatar, setAvatar, setBanner, uploadSceneImage } from '../media/service';
import { memoryStorage } from '../media/storage';
import type { Actor } from '../platform/authorize';
import { getStore, listOwnedItems, setItemOwned } from '../store/service';
import { createPost, createScene, inviteToScene, listPosts, removePost } from './service';

const text = (value: string) => [...value].map((char) => char.charCodeAt(0));
const be32 = (value: number) => [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
const pngChunk = (type: string, data: number[]) => [...be32(data.length), ...text(type), ...data, 0, 0, 0, 0];
const png = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...pngChunk('IHDR', [...be32(4), ...be32(4), 8, 6, 0, 0, 0]), ...pngChunk('IDAT', [1, 2, 3, 4]), ...pngChunk('IEND', [])]);
const gif = () => new Uint8Array([...text('GIF89a'), 4, 0, 4, 0, 0, 0, 0, 0x3b]);

let connection: DbConnection;
let thea: Actor;
let marcus: Actor;
let outsider: Actor;
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
  outsider = await addUser('outsider');
  staff = await addUser('warden', 'staff');
});

afterAll(async () => {
  await connection.close();
});

describe('pictures in a scene', () => {
  it('go out with a post, belong to it alone, and are hidden when it is removed', async () => {
    const { db } = connection;
    const captain = await createCharacter(db, thea, { name: 'Captain Thea' });
    const scene = await createScene(db, thea, { title: 'The Map Room', rating: 'teen', characterIds: [captain.id], openingPost: docFromText('She unrolled the chart.') });
    await inviteToScene(db, thea, scene.id, 'marcus');

    // Only someone who can post in the scene can upload to it.
    await expect(uploadSceneImage(db, storage, outsider, scene.id, png())).rejects.toMatchObject({ code: 'not_found' });
    const chart = await uploadSceneImage(db, storage, thea, scene.id, png());
    // Animation is welcome here, though not on a profile.
    const flicker = await uploadSceneImage(db, storage, thea, scene.id, gif());
    expect(flicker.contentType).toBe('image/gif');

    const post = await createPost(db, thea, scene.id, { kind: 'ic', characterId: captain.id, content: docFromText('Here.'), imageIds: [chart.id, flicker.id] });
    const shown = (await listPosts(db, marcus, scene.id, { stream: 'story' })).posts.find((row) => row.id === post.id);
    expect(shown?.images).toEqual([chart.id, flicker.id]);
    expect((await listPosts(db, marcus, scene.id, { stream: 'story' })).posts[0]?.images).toEqual([]);

    // A post may be pictures alone, but not nothing at all.
    const second = await uploadSceneImage(db, storage, thea, scene.id, png());
    const silent = await createPost(db, thea, scene.id, { kind: 'ic', characterId: null, content: EMPTY_DOC, imageIds: [second.id] });
    expect(silent.contentText).toBe('');
    await expect(createPost(db, thea, scene.id, { kind: 'ic', characterId: null, content: EMPTY_DOC })).rejects.toMatchObject({ code: 'invalid_input' });

    // Not a picture already on a post, not someone else's upload, not more than four.
    const refused = { code: 'invalid_input' };
    await expect(createPost(db, thea, scene.id, { kind: 'ic', content: docFromText('Again.'), imageIds: [chart.id] })).rejects.toMatchObject(refused);
    const theirs = await uploadSceneImage(db, storage, marcus, scene.id, png());
    await expect(createPost(db, thea, scene.id, { kind: 'ic', content: docFromText('Mine now.'), imageIds: [theirs.id] })).rejects.toMatchObject(refused);
    const five = await Promise.all([1, 2, 3, 4, 5].map(() => uploadSceneImage(db, storage, thea, scene.id, png())));
    await expect(createPost(db, thea, scene.id, { kind: 'ic', content: docFromText('Too many.'), imageIds: five.map((image) => image.id) })).rejects.toMatchObject(refused);

    // Removed: the pictures leave the scene and their addresses stop working, except for staff looking into a report.
    expect((await readMedia(db, storage, chart.id, marcus)).contentType).toBe('image/png');
    await removePost(db, thea, post.id);
    expect((await listPosts(db, marcus, scene.id, { stream: 'story' })).posts.find((row) => row.id === post.id)?.images).toEqual([]);
    await expect(readMedia(db, storage, chart.id, marcus)).rejects.toMatchObject({ code: 'not_found' });
    await expect(readMedia(db, storage, chart.id, thea)).rejects.toMatchObject({ code: 'not_found' });
    expect((await readMedia(db, storage, chart.id, staff)).contentType).toBe('image/png');
  });

  it('keeps a picture that a post still shows when it stops being a profile picture', async () => {
    const { db } = connection;
    const sitter = await createCharacter(db, thea, { name: 'The Sitter' });
    const scene = await createScene(db, thea, { title: 'Portraits', rating: 'teen', characterIds: [sitter.id], openingPost: docFromText('A gallery.') });
    const face = await setAvatar(db, storage, thea, png());
    await createPost(db, thea, scene.id, { kind: 'ic', content: docFromText('This is me.'), imageIds: [face.id] });
    await removeAvatar(db, storage, thea);
    expect((await readMedia(db, storage, face.id, marcus)).contentType).toBe('image/png');
  });
});

describe('profile pictures', () => {
  it('cannot be animated for now', async () => {
    const { db } = connection;
    const refused = { code: 'invalid_input', fields: { image: 'Animated GIFs cannot be used here for now. Use a PNG, JPEG or WebP image.' } };
    await expect(setAvatar(db, storage, marcus, gif())).rejects.toMatchObject(refused);
    await expect(setBanner(db, storage, marcus, gif())).rejects.toMatchObject(refused);
    expect((await setBanner(db, storage, marcus, png())).contentType).toBe('image/png');
  });
});

describe('the store', () => {
  it('has nothing to own yet, so every dice style is free and nothing can be handed out', async () => {
    const { db } = connection;
    expect((await getStore(db, thea)).items).toEqual([]);
    expect(await listOwnedItems(db, thea.userId)).toEqual([]);

    // Styles that were once kept back are now anyone's to choose.
    for (const theme of ['ivory', 'jade', 'ember', 'amethyst', 'starlight'] as const) expect(await setDiceTheme(db, thea, theme)).toBe(theme);
    await expect(setDiceTheme(db, thea, 'plutonium')).rejects.toMatchObject({ code: 'invalid_input' });

    // Giving an item is for staff, and only an item that exists. Neither is true of anything today.
    await expect(setItemOwned(db, thea, thea.userId, 'dice:jade', true)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(setItemOwned(db, staff, thea.userId, 'dice:jade', true)).rejects.toMatchObject({ code: 'invalid_input' });
  });
});
