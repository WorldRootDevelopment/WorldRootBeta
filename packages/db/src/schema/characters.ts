import { index, integer, jsonb, pgEnum, pgTable, primaryKey, text, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { createdAt, id, timestamptz, updatedAt } from './columns';
import { communities } from './community';
import { users } from './identity';
import { media } from './media';
import { worlds } from './worlds';

export const characterApprovalStatus = pgEnum('character_approval_status', ['pending', 'approved', 'returned', 'rejected']);

/** Values for a community's custom fields, keyed by field definition id. */
export type CharacterCustomValues = Record<string, string | number | string[]>;

/**
 * Library originals and community copies share this table. A row with a
 * community is a copy: the community decides whether it may be played, and its
 * player still writes it. A community row with no player is a community-owned NPC.
 */
export const characters = pgTable(
  'characters',
  {
    id: id(),
    playerUserId: uuid('player_user_id').references(() => users.id, { onDelete: 'set null' }),
    communityId: uuid('community_id').references(() => communities.id, { onDelete: 'cascade' }),
    sourceCharacterId: uuid('source_character_id').references((): AnyPgColumn => characters.id, {
      onDelete: 'set null',
    }),
    copiedAt: timestamptz('copied_at'),
    // Null on library originals, which no one approves.
    approvalStatus: characterApprovalStatus('approval_status'),

    name: text('name').notNull(),
    tagline: text('tagline'),
    portraitMediaId: uuid('portrait_media_id').references(() => media.id, { onDelete: 'set null' }),
    pronouns: text('pronouns'),
    age: text('age'),
    gender: text('gender'),
    species: text('species'),
    appearance: text('appearance'),
    personality: text('personality'),
    biography: text('biography'),
    skills: text('skills'),
    likes: text('likes'),
    dislikes: text('dislikes'),
    voice: text('voice'),
    boundaries: text('boundaries'),
    // Rich text documents for the long fields written in the editor, keyed by column name. The text columns hold their plain text.
    docs: jsonb('docs').$type<Record<string, unknown>>().notNull().default({}),
    customValues: jsonb('custom_values').$type<CharacterCustomValues>().notNull().default({}),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('characters_player_idx').on(t.playerUserId), index('characters_community_idx').on(t.communityId)],
);

/** Which worlds of its community a character appears in. */
export const characterWorldLinks = pgTable(
  'character_world_links',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worlds.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.characterId, t.worldId] }), index('character_world_links_world_idx').on(t.worldId)],
);

/**
 * Pictures in a character's gallery, in the order they are shown. This is apart from the portrait,
 * which is the one small picture beside the character's name. A community's copy of a character
 * starts with the same pictures as the original and points at the same images, so an image is
 * removed only when nothing refers to it any more.
 */
export const characterImages = pgTable(
  'character_images',
  {
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.characterId, t.mediaId] })],
);
