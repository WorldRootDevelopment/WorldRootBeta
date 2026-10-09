import { checkAchievements } from '../identity/achievements';
import { characterInputSchema, type CharacterInput } from '@worldroot/contracts';
import { characters, characterWorldLinks, communities, worlds, type CharacterCustomValues, type Db } from '@worldroot/db';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { communityGrants, isMember, listCharacterFields } from '../community/service';
import { membersWithPermission, notifyMany } from '../notifications/service';
import { recordAudit } from '../platform/audit';
import { CHARACTER_RICH_FIELDS, takeRichFields } from '../platform/rich-fields';
import { authorize, authorizeOwner, can, type Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { emitEvent } from '../platform/outbox';
import { parseInput } from '../platform/validate';

export type Character = typeof characters.$inferSelect;

/** Creates a character in the actor's own library. Only the name is required. */
export async function createCharacter(db: Db, actor: Actor, input: CharacterInput): Promise<Character> {
  const rich = takeRichFields(input, CHARACTER_RICH_FIELDS);
  const values = parseInput(characterInputSchema, rich.input);
  const [character] = await db
    .insert(characters)
    .values({ ...values, docs: rich.docs, playerUserId: actor.userId })
    .returning();
  await checkAchievements(db, actor.userId, 'characters');
  return character!;
}

/** A character is edited by its player, or in a community by staff who manage characters. */
export async function canEditCharacter(db: Db, actor: Actor, character: Character): Promise<boolean> {
  if (character.playerUserId === actor.userId || actor.platformRole === 'staff') return true;
  if (!character.communityId) return false;
  return can(actor, 'character.manage', { communityId: character.communityId }, communityGrants(db));
}

/**
 * Updates a character's profile. Editing an original never changes its community
 * copies, and editing a copy never changes the original.
 */
export async function updateCharacter(db: Db, actor: Actor, characterId: string, input: CharacterInput): Promise<Character> {
  const rich = takeRichFields(input, CHARACTER_RICH_FIELDS);
  const values = { ...parseInput(characterInputSchema, rich.input), docs: rich.docs };
  const [character] = await db.select().from(characters).where(eq(characters.id, characterId));
  if (!character) throw new DomainError('not_found', 'That character does not exist.');
  if (!(await canEditCharacter(db, actor, character))) throw new DomainError('forbidden', 'You cannot edit this character.');

  return db.transaction(async (tx) => {
    const [updated] = await tx.update(characters).set(values).where(eq(characters.id, characterId)).returning();
    // Changes to a community's copy are part of that community's record.
    if (character.communityId) {
      await recordAudit(tx, {
        actor,
        action: 'character.update',
        targetType: 'character',
        targetId: characterId,
        communityId: character.communityId,
        before: { name: character.name },
        after: { name: updated!.name },
      });
    }
    return updated!;
  });
}

export async function listLibraryCharacters(db: Db, userId: string): Promise<Character[]> {
  return db
    .select()
    .from(characters)
    .where(and(eq(characters.playerUserId, userId), isNull(characters.communityId)))
    .orderBy(asc(characters.name));
}

export async function listCommunityCharacters(db: Db, communityId: string): Promise<Character[]> {
  return db.select().from(characters).where(eq(characters.communityId, communityId)).orderBy(asc(characters.name));
}

export interface AddCharacterOptions {
  /** Values for the community's fields, keyed by field definition id. */
  customValues?: CharacterCustomValues;
  /** Worlds of this community the character appears in. */
  worldIds?: string[];
}

/**
 * Gives a community its own copy of a library character. The copy carries the
 * community's custom fields and approval status; the original is untouched.
 */
export async function addCharacterToCommunity(
  db: Db,
  actor: Actor,
  characterId: string,
  communityId: string,
  options: AddCharacterOptions = {},
): Promise<Character> {
  const [source] = await db.select().from(characters).where(eq(characters.id, characterId));
  if (!source || source.communityId || !source.playerUserId) {
    throw new DomainError('not_found', 'That character is not in your library.');
  }
  authorizeOwner(actor, source.playerUserId);
  await authorize(actor, 'character.submit', { communityId }, communityGrants(db));

  const fields = await listCharacterFields(db, communityId);
  const values = options.customValues ?? {};
  const known = new Set(fields.map((field) => field.id));
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field.id];
    const empty = value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    if (field.required && empty) errors[field.id] = `${field.label} is required.`;
  }
  if (Object.keys(errors).length > 0) {
    throw new DomainError('invalid_input', 'Fill in the fields this community requires.', { fields: errors });
  }
  const customValues = Object.fromEntries(Object.entries(values).filter(([key]) => known.has(key)));

  return db.transaction(async (tx) => {
    const [community] = await tx.select().from(communities).where(eq(communities.id, communityId));
    if (!community) throw new DomainError('not_found', 'That community does not exist.');

    const worldIds = options.worldIds ?? [];
    if (worldIds.length > 0) {
      const found = await tx
        .select({ id: worlds.id })
        .from(worlds)
        .where(and(eq(worlds.ownerCommunityId, communityId), inArray(worlds.id, worldIds)));
      if (found.length !== new Set(worldIds).size) {
        throw new DomainError('invalid_input', 'A character can only be linked to worlds in this community.');
      }
    }

    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...profile } = source;
    const [copy] = await tx
      .insert(characters)
      .values({
        ...profile,
        communityId,
        sourceCharacterId: source.id,
        copiedAt: new Date(),
        approvalStatus: community.requireCharacterApproval ? 'pending' : 'approved',
        customValues,
      })
      .returning();

    if (worldIds.length > 0) {
      await tx.insert(characterWorldLinks).values(worldIds.map((worldId) => ({ characterId: copy!.id, worldId })));
    }

    await recordAudit(tx, {
      actor,
      action: 'character.add',
      targetType: 'character',
      targetId: copy!.id,
      communityId,
      after: { name: copy!.name, sourceCharacterId: source.id, approvalStatus: copy!.approvalStatus },
    });
    await emitEvent(tx, 'character.copied', { characterId: copy!.id, sourceCharacterId: source.id, communityId });
    // A character waiting for review is brought to the reviewers' attention.
    if (copy!.approvalStatus === 'pending') {
      await notifyMany(tx, await membersWithPermission(tx, communityId, 'character.approve'), {
        type: 'character.pending',
        groupKey: `community:${communityId}:pending`,
        subject: community.name,
        href: `/c/${community.slug}/settings/characters`,
        actorUserId: actor.userId,
        preview: copy!.name,
      });
    }

    return copy!;
  });
}

export interface CharacterView {
  character: Character;
  /** Set for community copies. */
  community: { id: string; slug: string; name: string; accentHue: number } | null;
  /** The community's fields with this character's values, in template order. */
  customFields: Array<{ label: string; value: string }>;
  /** The original's name, when this is a copy the viewer made. */
  sourceName: string | null;
  canEdit: boolean;
}

/** Loads a character the actor may see: their own, or one in a community they can view. */
export async function getCharacterView(db: Db, actor: Actor, characterId: string): Promise<CharacterView> {
  const missing = new DomainError('not_found', 'That character does not exist.');
  const [character] = await db.select().from(characters).where(eq(characters.id, characterId));
  if (!character) throw missing;

  const own = character.playerUserId === actor.userId;
  if (!character.communityId) {
    if (!own && actor.platformRole !== 'staff') throw missing;
    return { character, community: null, customFields: [], sourceName: null, canEdit: true };
  }

  const [community] = await db.select().from(communities).where(eq(communities.id, character.communityId));
  const visible = community && (community.listed || own || (await isMember(db, actor.userId, community.id)));
  if (!community || !(visible || actor.platformRole === 'staff')) throw missing;

  const fields = await listCharacterFields(db, community.id);
  const customFields = fields.flatMap((field) => {
    const value = character.customValues[field.id];
    if (value === undefined || value === '') return [];
    return [{ label: field.label, value: Array.isArray(value) ? value.join(', ') : String(value) }];
  });

  let sourceName: string | null = null;
  if (own && character.sourceCharacterId) {
    const [source] = await db
      .select({ name: characters.name })
      .from(characters)
      .where(eq(characters.id, character.sourceCharacterId));
    sourceName = source?.name ?? null;
  }

  return {
    character,
    community: { id: community.id, slug: community.slug, name: community.name, accentHue: community.accentHue },
    customFields,
    sourceName,
    canEdit: await canEditCharacter(db, actor, character),
  };
}
