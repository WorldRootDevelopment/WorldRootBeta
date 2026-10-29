import { characterRelationships, characters, type Db } from '@worldroot/db';
import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';

/**
 * For people who keep characters for their own sake: sharing one so others can
 * see it, saying how one relates to another, and private notes about it.
 *
 * All of these belong to library originals, the characters in a person's own
 * library. A community's copy of a character is that community's to show.
 */

/** A library original the actor plays, or an error as if it did not exist. */
async function ownOriginal(db: Db, actor: Actor, characterId: string) {
  const [character] = await db.select().from(characters).where(eq(characters.id, characterId));
  if (!character || character.communityId || character.playerUserId !== actor.userId) throw new DomainError('not_found', 'That character is not in your library.');
  return character;
}

/** Shares a library character, so anyone signed in can open its page, or makes it private again. */
export async function setCharacterShared(db: Db, actor: Actor, characterId: string, shared: boolean): Promise<void> {
  await ownOriginal(db, actor, characterId);
  await db.update(characters).set({ shared }).where(eq(characters.id, characterId));
}

/** Saves the notes about a character that only its player ever sees. */
export async function setCharacterNotes(db: Db, actor: Actor, characterId: string, notes: unknown): Promise<string | null> {
  await ownOriginal(db, actor, characterId);
  const text = typeof notes === 'string' ? notes.replace(/\r\n?/g, '\n').trim() : '';
  if (text.length > 10_000) throw new DomainError('invalid_input', 'Keep notes under 10,000 characters.', { fields: { notes: 'Keep notes under 10,000 characters.' } });
  await db.update(characters).set({ privateNotes: text || null }).where(eq(characters.id, characterId));
  return text || null;
}

/** The library characters a person has shared, for their profile. */
export async function listSharedCharacters(db: Db, userId: string) {
  return db
    .select()
    .from(characters)
    .where(and(eq(characters.playerUserId, userId), isNull(characters.communityId), eq(characters.shared, true)))
    .orderBy(asc(characters.name));
}

export interface Relationship {
  id: string;
  /** The other character in it, seen from the character whose page this is. */
  other: { id: string; name: string };
  label: string;
}

/**
 * Says how two of the actor's own characters are related: "Siblings",
 * "Rivals", "Old flames". One label, shown the same on both pages.
 */
export async function addRelationship(db: Db, actor: Actor, characterId: string, otherId: unknown, label: unknown): Promise<Relationship> {
  const character = await ownOriginal(db, actor, characterId);
  if (typeof otherId !== 'string' || otherId === characterId) throw new DomainError('invalid_input', 'Choose another of your characters.', { fields: { other: 'Choose another of your characters.' } });
  const other = await ownOriginal(db, actor, otherId).catch(() => {
    throw new DomainError('invalid_input', 'Choose another of your characters.', { fields: { other: 'Choose another of your characters.' } });
  });
  const text = typeof label === 'string' ? label.trim() : '';
  if (!text || text.length > 40) throw new DomainError('invalid_input', 'Describe it in 1 to 40 characters.', { fields: { label: 'Describe it in 1 to 40 characters.' } });

  const [existing] = await db
    .select({ id: characterRelationships.id })
    .from(characterRelationships)
    .where(
      or(
        and(eq(characterRelationships.characterId, characterId), eq(characterRelationships.otherCharacterId, otherId)),
        and(eq(characterRelationships.characterId, otherId), eq(characterRelationships.otherCharacterId, characterId)),
      ),
    );
  if (existing) {
    // A pair has one relationship; saying it again changes what it is called.
    await db.update(characterRelationships).set({ label: text }).where(eq(characterRelationships.id, existing.id));
    return { id: existing.id, other: { id: other.id, name: other.name }, label: text };
  }
  const [row] = await db.insert(characterRelationships).values({ characterId: character.id, otherCharacterId: other.id, label: text }).returning();
  return { id: row!.id, other: { id: other.id, name: other.name }, label: text };
}

/** Removes a relationship between two of the actor's characters. */
export async function removeRelationship(db: Db, actor: Actor, relationshipId: string): Promise<void> {
  const [row] = await db.select().from(characterRelationships).where(eq(characterRelationships.id, relationshipId));
  if (!row) return;
  await ownOriginal(db, actor, row.characterId);
  await db.delete(characterRelationships).where(eq(characterRelationships.id, relationshipId));
}

/**
 * A character's relationships, from either side. Someone else sees only the
 * ones whose other character is shared, so a private character's name is never
 * shown through a shared one.
 */
export async function listRelationships(db: Db, actor: Actor, characterId: string): Promise<Relationship[]> {
  const rows = await db
    .select()
    .from(characterRelationships)
    .where(or(eq(characterRelationships.characterId, characterId), eq(characterRelationships.otherCharacterId, characterId)))
    .orderBy(asc(characterRelationships.createdAt));
  if (rows.length === 0) return [];
  const otherIds = rows.map((row) => (row.characterId === characterId ? row.otherCharacterId : row.characterId));
  const others = await db
    .select({ id: characters.id, name: characters.name, shared: characters.shared, playerUserId: characters.playerUserId })
    .from(characters)
    .where(inArray(characters.id, otherIds));
  return rows.flatMap((row) => {
    const other = others.find((candidate) => candidate.id === (row.characterId === characterId ? row.otherCharacterId : row.characterId));
    if (!other) return [];
    const visible = other.playerUserId === actor.userId || other.shared || actor.platformRole === 'staff';
    return visible ? [{ id: row.id, other: { id: other.id, name: other.name }, label: row.label }] : [];
  });
}
