import { media, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { docFromText } from '@worldroot/editor';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCharacter } from '../characters/service';
import { exportAccountData } from '../identity/export';
import { createProfile, getProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { createStory, saveChapter } from '../stories/service';
import { addCharacterImage, listRecentUploads, readMedia, removeUpload, setAvatar, UPLOAD_LIMITS } from './service';
import { memoryStorage } from './storage';

const text = (value: string) => [...value].map((char) => char.charCodeAt(0));
const be32 = (value: number) => [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
const pngChunk = (type: string, data: number[]) => [...be32(data.length), ...text(type), ...data, 0, 0, 0, 0];
const png = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...pngChunk('IHDR', [...be32(4), ...be32(4), 8, 6, 0, 0, 0]), ...pngChunk('IDAT', [1, 2, 3, 4]), ...pngChunk('IEND', [])]);

let connection: DbConnection;
let thea: Actor;
let flooder: Actor;
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
  flooder = await addUser('flooder');
  staff = await addUser('warden', 'staff');
});

afterAll(async () => {
  await connection.close();
});

describe('uploads', () => {
  it('are limited per hour for everyone but staff', async () => {
    const { db } = connection;
    // Uploads made earlier, recorded directly, count against the hour.
    await db.insert(media).values(Array.from({ length: UPLOAD_LIMITS.perHour }, () => ({ uploaderUserId: flooder.userId, contentType: 'image/png', byteSize: 10 })));
    await expect(setAvatar(db, storage, flooder, png())).rejects.toMatchObject({ code: 'rate_limited' });
    await db.insert(media).values(Array.from({ length: UPLOAD_LIMITS.perHour }, () => ({ uploaderUserId: staff.userId, contentType: 'image/png', byteSize: 10 })));
    expect((await setAvatar(db, storage, staff, png())).contentType).toBe('image/png');
  });

  it('show staff who uploaded what and where it is shown, and staff can take one down everywhere', async () => {
    const { db } = connection;
    const face = await setAvatar(db, storage, thea, png());
    const captain = await createCharacter(db, thea, { name: 'Captain Thea' });
    const sketch = await addCharacterImage(db, storage, thea, captain.id, png());

    await expect(listRecentUploads(db, thea)).rejects.toMatchObject({ code: 'forbidden' });
    const recent = await listRecentUploads(db, staff, { limit: 5 });
    expect(recent[0]).toMatchObject({ id: sketch.id, uploader: { handle: 'thea' }, usedIn: [{ label: 'Gallery of Captain Thea', href: `/characters/${captain.id}` }] });
    expect(recent[1]).toMatchObject({ id: face.id, usedIn: [{ label: 'Profile picture of @thea', href: '/u/thea' }] });

    await expect(removeUpload(db, storage, thea, face.id)).rejects.toMatchObject({ code: 'forbidden' });
    await removeUpload(db, storage, staff, face.id);
    expect((await getProfile(db, thea.userId))!.avatarId).toBeNull();
    await expect(readMedia(db, storage, face.id)).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('downloading your data', () => {
  it('gathers what the person made, and nothing of anyone else’s', async () => {
    const { db } = connection;
    const { story, chapter } = await createStory(db, thea, { title: 'The Late Train', rating: 'teen', visibility: 'private' });
    await saveChapter(db, thea, chapter.id, { title: 'Platform Four', content: docFromText('The 11:40 was late again.') });
    const data = await exportAccountData(db, thea);
    expect(data).toMatchObject({ format: 'worldroot-export', account: { email: 'thea@example.com' }, profile: { handle: 'thea' } });
    expect(data.characters.map((character) => character.name)).toEqual(['Captain Thea']);
    expect((data.characters[0]!.gallery as string[])[0]).toMatch(/^\/api\/v1\/media\//);
    expect(data.stories).toMatchObject([{ id: story.id, title: 'The Late Train', chapters: [{ title: 'Platform Four', text: 'The 11:40 was late again.' }] }]);
    expect(JSON.stringify(data)).not.toContain('flooder');

    const [guest] = await db.insert(users).values({ name: 'guest', email: 'guest@worldroot.test' }).returning();
    await expect(exportAccountData(db, { userId: guest!.id, platformRole: 'user' })).rejects.toMatchObject({ code: 'forbidden' });
    expect((await db.select().from(users).where(eq(users.id, thea.userId))).length).toBe(1);
  });
});
