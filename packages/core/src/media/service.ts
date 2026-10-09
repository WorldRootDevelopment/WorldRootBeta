import { checkAchievements } from '../identity/achievements';
import { FREE_LIMITS, PREMIUM, PREMIUM_LIMITS } from '@worldroot/contracts';
import { characterImages, characters, media, profiles, scenePostImages, scenePosts, type Db } from '@worldroot/db';
import { and, asc, count, eq, max, or } from 'drizzle-orm';
import { canEditCharacter } from '../characters/service';
import { characterImageLimit } from '../identity/plan';
import { recordAudit } from '../platform/audit';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { getSceneForPosting } from '../scenes/service';
import { checkImage } from './images';
import type { MediaStorage } from './storage';

export type Media = typeof media.$inferSelect;

/** Checks an upload, stores its bytes and records it. Nothing refers to it until the caller says so. */
async function store(db: Db, storage: MediaStorage, actor: Actor, upload: Uint8Array, options: { gif: boolean }): Promise<Media> {
  const image = checkImage(upload);
  if (!options.gif && image.contentType === 'image/gif') {
    // Animated profile pictures are switched off for now. They are still welcome in scenes.
    const message = 'Animated GIFs cannot be used here for now. Use a PNG, JPEG or WebP image.';
    throw new DomainError('invalid_input', message, { fields: { image: message } });
  }
  const [row] = await db.insert(media).values({ uploaderUserId: actor.userId, contentType: image.contentType, byteSize: image.bytes.length }).returning();
  try {
    await storage.put(row!.id, image.bytes);
  } catch (error) {
    await db.delete(media).where(eq(media.id, row!.id));
    throw error;
  }
  return row!;
}

/** Removes an image once no profile, character or post points at it. A community's copy of a character shares its original's portrait. */
async function release(db: Db, storage: MediaStorage, mediaId: string | null): Promise<void> {
  if (!mediaId) return;
  const [[asAvatar], [asPortrait], [inPost], [inGallery]] = await Promise.all([
    db.select({ value: count() }).from(profiles).where(or(eq(profiles.avatarMediaId, mediaId), eq(profiles.bannerMediaId, mediaId))),
    db.select({ value: count() }).from(characters).where(eq(characters.portraitMediaId, mediaId)),
    db.select({ value: count() }).from(scenePostImages).where(eq(scenePostImages.mediaId, mediaId)),
    db.select({ value: count() }).from(characterImages).where(eq(characterImages.mediaId, mediaId)),
  ]);
  if ((asAvatar?.value ?? 0) + (asPortrait?.value ?? 0) + (inPost?.value ?? 0) + (inGallery?.value ?? 0) > 0) return;
  await db.delete(media).where(eq(media.id, mediaId));
  await storage.remove(mediaId);
}

/** Sets the actor's own profile picture, replacing any they had. */
export async function setAvatar(db: Db, storage: MediaStorage, actor: Actor, upload: Uint8Array): Promise<Media> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, actor.userId));
  if (!profile) throw new DomainError('not_found', 'Finish setting up your profile first.');
  const stored = await store(db, storage, actor, upload, { gif: false });
  await db.update(profiles).set({ avatarMediaId: stored.id }).where(eq(profiles.userId, actor.userId));
  await release(db, storage, profile.avatarMediaId);
  await checkAchievements(db, actor.userId, 'profile');
  return stored;
}

/** Removes a profile picture: your own, or anyone's if you are WorldRoot staff, which is recorded. */
export async function removeAvatar(db: Db, storage: MediaStorage, actor: Actor, userId: string = actor.userId): Promise<void> {
  const self = userId === actor.userId;
  if (!self && actor.platformRole !== 'staff') throw new DomainError('forbidden', 'Only Rootwardens, the WorldRoot staff, can do that.');
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
  const stored = await store(db, storage, actor, upload, { gif: false });
  await db.update(profiles).set({ bannerMediaId: stored.id }).where(eq(profiles.userId, actor.userId));
  await release(db, storage, profile.bannerMediaId);
  return stored;
}

/** Removes a profile banner: your own, or anyone's if you are WorldRoot staff, which is recorded. */
export async function removeBanner(db: Db, storage: MediaStorage, actor: Actor, userId: string = actor.userId): Promise<void> {
  const self = userId === actor.userId;
  if (!self && actor.platformRole !== 'staff') throw new DomainError('forbidden', 'Only Rootwardens, the WorldRoot staff, can do that.');
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
  const stored = await store(db, storage, actor, upload, { gif: false });
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

export interface CharacterGallery {
  /** The ids of the pictures, in order, served from /api/v1/media. */
  images: string[];
  /** How many this character may hold, by its player's plan. */
  limit: number;
}

/** A character's gallery. Anyone who can see the character can see it, so the caller checks that first. */
export async function getCharacterGallery(db: Db, character: { id: string; playerUserId: string | null }): Promise<CharacterGallery> {
  const [rows, limit] = await Promise.all([
    db.select({ mediaId: characterImages.mediaId }).from(characterImages).where(eq(characterImages.characterId, character.id)).orderBy(asc(characterImages.position)),
    characterImageLimit(db, character.playerUserId),
  ]);
  return { images: rows.map((row) => row.mediaId), limit };
}

/** Adds a picture to a character's gallery. Whoever may edit the character may add to it, up to the player's limit. */
export async function addCharacterImage(db: Db, storage: MediaStorage, actor: Actor, characterId: string, upload: Uint8Array): Promise<Media> {
  const character = await editableCharacter(db, actor, characterId);
  const limit = await characterImageLimit(db, character.playerUserId);
  const [held] = await db.select({ value: count(), last: max(characterImages.position) }).from(characterImages).where(eq(characterImages.characterId, characterId));
  if ((held?.value ?? 0) >= limit) {
    const message =
      limit >= PREMIUM_LIMITS.characterImages
        ? `A character’s gallery holds ${PREMIUM_LIMITS.characterImages} pictures. Remove one to add another.`
        : `A free account can add ${FREE_LIMITS.characterImages} picture to a character’s gallery. ${PREMIUM.name}, which is coming soon, allows ${PREMIUM_LIMITS.characterImages}.`;
    throw new DomainError('forbidden', message, { fields: { image: message } });
  }
  const stored = await store(db, storage, actor, upload, { gif: false });
  await db.insert(characterImages).values({ characterId, mediaId: stored.id, position: (held?.last ?? -1) + 1 });
  return stored;
}

/** Takes a picture out of a character's gallery. When it is not the player doing it, the removal is recorded. */
export async function removeCharacterImage(db: Db, storage: MediaStorage, actor: Actor, characterId: string, mediaId: string): Promise<void> {
  const character = await editableCharacter(db, actor, characterId);
  const removed = await db.transaction(async (tx) => {
    const rows = await tx.delete(characterImages).where(and(eq(characterImages.characterId, characterId), eq(characterImages.mediaId, mediaId))).returning({ mediaId: characterImages.mediaId });
    if (rows.length > 0 && character.playerUserId !== actor.userId) {
      await recordAudit(tx, { actor, action: 'character.image.remove', targetType: 'character', targetId: characterId, communityId: character.communityId });
    }
    return rows.length > 0;
  });
  if (removed) await release(db, storage, mediaId);
}

/**
 * Stores a picture for a scene post. The actor must be able to post in the scene. The picture is
 * not shown anywhere until a post names it; one that never is stays stored and unseen.
 */
export async function uploadSceneImage(db: Db, storage: MediaStorage, actor: Actor, sceneId: string, upload: Uint8Array): Promise<Media> {
  await getSceneForPosting(db, actor, sceneId);
  return store(db, storage, actor, upload, { gif: true });
}

/**
 * An image's type and bytes, for serving. A picture on a post that has been removed is served to
 * WorldRoot staff only: it is kept so a report about it can still be looked into, but nobody else
 * can open it, even with its address.
 */
export async function readMedia(db: Db, storage: MediaStorage, mediaId: string, actor?: Actor): Promise<{ contentType: string; bytes: Uint8Array }> {
  const [attached] = await db
    .select({ removedAt: scenePosts.removedAt })
    .from(scenePostImages)
    .innerJoin(scenePosts, eq(scenePosts.id, scenePostImages.postId))
    .where(eq(scenePostImages.mediaId, mediaId));
  if (attached?.removedAt && actor?.platformRole !== 'staff') throw new DomainError('not_found', 'That image does not exist.');
  const [row] = await db.select().from(media).where(eq(media.id, mediaId));
  const bytes = row ? await storage.get(row.id) : null;
  if (!row || !bytes) throw new DomainError('not_found', 'That image does not exist.');
  return { contentType: row.contentType, bytes };
}
