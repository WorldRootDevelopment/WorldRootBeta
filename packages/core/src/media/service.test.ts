import { auditLog, media, users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCharacterToCommunity, createCharacter } from '../characters/service';
import { createCommunity } from '../community/service';
import { createProfile, getProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { checkImage, MAX_IMAGE_BYTES } from './images';
import { readMedia, removeAvatar, removePortrait, setAvatar, setPortrait } from './service';
import { memoryStorage } from './storage';

const text = (value: string) => [...value].map((char) => char.charCodeAt(0));
const be32 = (value: number) => [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
const le32 = (value: number) => [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
const holds = (bytes: Uint8Array, needle: string) => Buffer.from(bytes).includes(Buffer.from(needle, 'latin1'));

const pngChunk = (type: string, data: number[]) => [...be32(data.length), ...text(type), ...data, 0, 0, 0, 0];
const png = (width = 4, height = 4) =>
  new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...pngChunk('IHDR', [...be32(width), ...be32(height), 8, 6, 0, 0, 0]),
    ...pngChunk('tEXt', text('Author\0Thea Example')),
    ...pngChunk('eXIf', text('GPS 51.5,-0.1')),
    ...pngChunk('IDAT', [1, 2, 3, 4]),
    ...pngChunk('IEND', []),
    ...text('trailing junk'),
  ]);

const jpegSegment = (marker: number, data: number[]) => [0xff, marker, ((data.length + 2) >> 8) & 255, (data.length + 2) & 255, ...data];
const jpeg = (width = 4, height = 4) =>
  new Uint8Array([
    0xff, 0xd8,
    ...jpegSegment(0xe0, text('JFIF\0')),
    ...jpegSegment(0xe1, text('Exif\0\0GPS 51.5,-0.1')),
    ...jpegSegment(0xfe, text('made at home')),
    ...jpegSegment(0xc0, [8, (height >> 8) & 255, height & 255, (width >> 8) & 255, width & 255, 1, 1, 0x11, 0]),
    ...jpegSegment(0xda, [1, 1, 0, 0, 63, 0]),
    9, 9, 9, 0xff, 0xd9,
  ]);

const riffChunk = (type: string, data: number[]) => [...text(type), ...le32(data.length), ...data, ...(data.length % 2 ? [0] : [])];
const webp = () => {
  const body = [
    ...riffChunk('VP8X', [0x08 | 0x04 | 0x10, 0, 0, 0, 3, 0, 0, 3, 0, 0]),
    ...riffChunk('VP8 ', [1, 2, 3, 4, 5]),
    ...riffChunk('EXIF', text('GPS 51.5,-0.1')),
    ...riffChunk('XMP ', text('<x>Thea Example</x>')),
  ];
  return new Uint8Array([...text('RIFF'), ...le32(body.length + 4), ...text('WEBP'), ...body]);
};
const gif = new Uint8Array([...text('GIF89a'), 4, 0, 4, 0, 0, 0, 0, 0x3b]);

describe('checking an upload', () => {
  it('identifies an image by its bytes and removes what could identify its maker', () => {
    const cleanPng = checkImage(png());
    expect(cleanPng.contentType).toBe('image/png');
    expect(holds(cleanPng.bytes, 'Thea Example') || holds(cleanPng.bytes, 'GPS') || holds(cleanPng.bytes, 'trailing')).toBe(false);
    expect(holds(cleanPng.bytes, 'IDAT') && holds(cleanPng.bytes, 'IEND')).toBe(true);

    const cleanJpeg = checkImage(jpeg());
    expect(cleanJpeg.contentType).toBe('image/jpeg');
    expect(holds(cleanJpeg.bytes, 'GPS') || holds(cleanJpeg.bytes, 'made at home')).toBe(false);
    expect(holds(cleanJpeg.bytes, 'JFIF')).toBe(true);
    expect([...cleanJpeg.bytes.slice(-5)]).toEqual([9, 9, 9, 0xff, 0xd9]);

    const cleanWebp = checkImage(webp());
    expect(cleanWebp.contentType).toBe('image/webp');
    expect(holds(cleanWebp.bytes, 'GPS') || holds(cleanWebp.bytes, 'Thea Example')).toBe(false);
    // The container's length and its "has Exif / has XMP" flags agree with what is left. Other flags are kept.
    expect(new DataView(cleanWebp.bytes.buffer).getUint32(4, true)).toBe(cleanWebp.bytes.length - 8);
    expect(cleanWebp.bytes[20]).toBe(0x10);

    expect(checkImage(gif).contentType).toBe('image/gif');
  });

  it('refuses what is not an image, is too large, or is damaged', () => {
    const refused = (bytes: Uint8Array) => {
      try {
        checkImage(bytes);
        return null;
      } catch (error) {
        return (error as { code?: string }).code;
      }
    };
    expect(refused(new Uint8Array(text('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')))).toBe('invalid_input');
    expect(refused(new Uint8Array(text('<html><script>alert(1)</script>')))).toBe('invalid_input');
    expect(refused(new Uint8Array([0x4d, 0x5a, 0x90, 0]))).toBe('invalid_input');
    expect(refused(new Uint8Array(0))).toBe('invalid_input');
    expect(refused(new Uint8Array(MAX_IMAGE_BYTES + 1))).toBe('invalid_input');
    expect(refused(png(5_000, 10))).toBe('invalid_input');
    expect(refused(jpeg(10, 5_000))).toBe('invalid_input');
    // Cut short, or claiming a chunk longer than the file.
    expect(refused(png().slice(0, 20))).toBe('invalid_input');
    expect(refused(jpeg().slice(0, 12))).toBe('invalid_input');
    expect(refused(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xff, 0xff, 0xff, ...text('IHDR'), 0, 0, 0, 0]))).toBe('invalid_input');
  });
});

describe('profile pictures and portraits', () => {
  let connection: DbConnection;
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
  });
  afterAll(async () => {
    await connection.close();
  });

  it('are stored once, replaced cleanly, shared by copies, and removable by the right people', async () => {
    const { db } = connection;
    const storage = memoryStorage();
    const thea = await addUser('thea');
    const marcus = await addUser('marcus');
    const staff = await addUser('staffer', true);
    const rows = async () => (await db.select().from(media)).length;

    const first = await setAvatar(db, storage, thea, jpeg());
    expect((await getProfile(db, thea.userId))!.avatarId).toBe(first.id);
    const served = await readMedia(db, storage, first.id);
    expect(served.contentType).toBe('image/jpeg');
    expect(holds(served.bytes, 'GPS')).toBe(false);

    // Replacing a picture leaves no orphan behind.
    const second = await setAvatar(db, storage, thea, png());
    expect([await rows(), storage.size()]).toEqual([1, 1]);
    await expect(readMedia(db, storage, first.id)).rejects.toMatchObject({ code: 'not_found' });
    // A refused upload changes nothing.
    await expect(setAvatar(db, storage, thea, new Uint8Array(text('not an image')))).rejects.toMatchObject({ code: 'invalid_input' });
    expect((await getProfile(db, thea.userId))!.avatarId).toBe(second.id);

    // Only staff can remove someone else's, and that is recorded.
    await expect(removeAvatar(db, storage, marcus, thea.userId)).rejects.toMatchObject({ code: 'forbidden' });
    await removeAvatar(db, storage, staff, thea.userId);
    expect((await getProfile(db, thea.userId))!.avatarId).toBeNull();
    expect(await db.select().from(auditLog).where(eq(auditLog.action, 'platform.avatar.remove'))).toHaveLength(1);
    expect([await rows(), storage.size()]).toEqual([0, 0]);

    // A portrait travels with a community copy, and survives until the last character using it lets go.
    const character = await createCharacter(db, thea, { name: 'Captain' });
    await expect(setPortrait(db, storage, marcus, character.id, png())).rejects.toMatchObject({ code: 'not_found' });
    const portrait = await setPortrait(db, storage, thea, character.id, webp());
    const community = await createCommunity(db, thea, { slug: 'valley', name: 'Valley' });
    const copy = await addCharacterToCommunity(db, thea, character.id, community.id);
    expect(copy.portraitMediaId).toBe(portrait.id);
    await removePortrait(db, storage, thea, character.id);
    expect((await readMedia(db, storage, portrait.id)).contentType).toBe('image/webp');
    await removePortrait(db, storage, staff, copy.id);
    await expect(readMedia(db, storage, portrait.id)).rejects.toMatchObject({ code: 'not_found' });
    expect(await db.select().from(auditLog).where(eq(auditLog.action, 'character.portrait.remove'))).toHaveLength(1);
    expect([await rows(), storage.size()]).toEqual([0, 0]);
  });
});
