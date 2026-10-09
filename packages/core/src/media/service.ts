import { checkAchievements } from '../identity/achievements';
import { characters, media, profiles, type Db } from '@worldroot/db';
import { count, eq, or } from 'drizzle-orm';
import { canEditCharacter } from '../characters/service';
import { recordAudit } from '../platform/audit';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { checkImage } from './images';
import type { MediaStorage } from './storage';

export type Media = typeof media.$inferSelect;

/** Checks an upload, stores its bytes and records it. Nothing refers to it until the caller says so. */
async function store(db: Db, storage: MediaStorage, actor: Actor, upload: Uint8Array): Promise<Media> {
  const image = checkImage(upload);
  const [row] = await db.insert(media).values({ uploaderUserId: actor.userId, contentType: image.contentType, byteSize: image.bytes.length }).returning();
  try {
    await storage.put(row!.id, image.bytes);
  } catch (error) {
    await db.delete(media).where(eq(media.id, row!.id));
    throw error;
  }
  return row!;
}

/** Removes an image once no profile or character points at it. A community's copy of a character shares its original's portrait. */
async function release(db: Db, storage: MediaStorage, mediaId: string | null): Promise<void> {
  if (!mediaId) return;
  const [[asAvatar], [asPortrait]] = await Promise.all([
    db.select({ value: count() }).from(profiles).where(or(eq(profiles.avatarMediaId, mediaId), eq(profiles.bannerMediaId, mediaId))),
    db.select({ value: count() }).from(characters).where(eq(characters.portraitMediaId, mediaId)),
  ]);
  if ((asAvatar?.value ?? 0) + (asPortrait?.value ?? 0) > 0) return;
  await db.delete(media).where(eq(media.id, mediaId));
  await storage.remove(mediaId);
}

/** Sets the actor's own profile picture, replacing any they had. */
export async function setAvatar(db: Db, storage: MediaStorage, actor: Actor, upload: Uint8Array): Promise<Media> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, actor.userId));
  if (!profile) throw new DomainError('not_found', 'Finish setting up your profile first.');
  const stored = await store(db, storage, actor, upload);
  await db.update(profiles).set({ avatarMediaId: stored.id }).where(eq(profiles.userId, actor.userId));
  await release(db, storage, profile.avatarMediaId);
  await checkAchievements(db, actor.userId, 'profile');
  return stored;
}

/** Removes a profile picture: your own, or anyone's if you are WorldRoot staff, which is recorded. */
export async function removeAvatar(db: Db, storage: MediaStorage, actor: Actor, userId: string = actor.userId): Promise<void> {
  const self = userId === actor.userId;
  if (!self && actor.platformRole !== 'staff') throw new DomainError('forbidden', 'Only WorldRoot staff can do that.');
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  if (!profile) throw new DomainError('not_found', 'That account does not exist.');
  if (!profile.avatarMediaId) return;
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({ avatarMediaId: null }).where(eq(profiles.userId, userId));
    if (!self) await recordAudit(tx, { actor, action: 'platform.avatar.remove', targetType: 'user', targetId: userId });
  });
  await release(db, storage, profile.avatarMediaId);
}

/** Sets the wide picture across the top of the actor's own profile. */
export async function setBanner(db: Db, storage: MediaStorage, actor: Actor, upload: Uint8Array): Promise<Media> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, actor.userId));
  if (!profile) throw new DomainError('not_found', 'Finish setting up your profile first.');
  const stored = await store(db, storage, actor, upload);
  await db.update(profiles).set({ bannerMediaId: stored.id }).where(eq(profiles.userId, actor.userId));
  await release(db, storage, profile.bannerMediaId);
  return stored;
}

/** Removes a profile banner: your own, or anyone's if you are WorldRoot staff, which is recorded. */
export async function removeBanner(db: Db, storage: MediaStorage, actor: Actor, userId: string = actor.userId): Promise<void> {
  const self = userId === actor.userId;
  if (!self && actor.platformRole !== 'staff') throw new DomainError('forbidden', 'Only WorldRoot staff can do that.');
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  if (!profile) throw new DomainError('not_found', 'That account does not exist.');
  if (!profile.bannerMediaId) return;
  await db.transaction(async (tx) => {
    await tx.update(profiles).set({ bannerMediaId: null }).where(eq(profiles.userId, userId));
    if (!self) await recordAudit(tx, { actor, action: 'platform.banner.remove', targetType: 'user', targetId: userId });
  });
  await release(db, storage, profile.bannerMediaId);
}

async function editableCharacter(db: Db, actor: Actor, characterId: string) {
  const [character] = await db.select().from(characters).where(eq(characters.id, characterId));
  // Someone who cannot edit a character is not told whether it exists.
  if (!character || !(await canEditCharacter(db, actor, character))) throw new DomainError('not_found', 'That character does not exist.');
  return character;
}

/** Sets a character's portrait. Whoever may edit the character may change it. */
export async function setPortrait(db: Db, storage: MediaStorage, actor: Actor, characterId: string, upload: Uint8Array): Promise<Media> {
  const character = await editableCharacter(db, actor, characterId);
  const stored = await store(db, storage, actor, upload);
  await db.update(characters).set({ portraitMediaId: stored.id }).where(eq(characters.id, characterId));
  await release(db, storage, character.portraitMediaId);
  return stored;
}

/** Removes a character's portrait. When it is not the player doing it, the removal is recorded. */
export async function removePortrait(db: Db, storage: MediaStorage, actor: Actor, characterId: string): Promise<void> {
  const character = await editableCharacter(db, actor, characterId);
  if (!character.portraitMediaId) return;
  await db.transaction(async (tx) => {
    await tx.update(characters).set({ portraitMediaId: null }).where(eq(characters.id, characterId));
    if (character.playerUserId !== actor.userId) {
      await recordAudit(tx, { actor, action: 'character.portrait.remove', targetType: 'character', targetId: characterId, communityId: character.communityId });
    }
  });
  await release(db, storage, character.portraitMediaId);
}

/** An image's type and bytes, for serving. */
export async function readMedia(db: Db, storage: MediaStorage, mediaId: string): Promise<{ contentType: string; bytes: Uint8Array }> {
  const [row] = await db.select().from(media).where(eq(media.id, mediaId));
  const bytes = row ? await storage.get(row.id) : null;
  if (!row || !bytes) throw new DomainError('not_found', 'That image does not exist.');
  return { contentType: row.contentType, bytes };
}
