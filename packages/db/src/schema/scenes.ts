import { index, integer, jsonb, pgEnum, pgTable, primaryKey, text, unique, uuid } from 'drizzle-orm/pg-core';
import { characters } from './characters';
import { createdAt, id, timestamptz, updatedAt } from './columns';
import { communities } from './community';
import { users } from './identity';
import { media } from './media';
import { locations } from './worlds';

export const sceneStatus = pgEnum('scene_status', ['active', 'on_hold', 'completed', 'archived']);
export const contentRating = pgEnum('content_rating', ['everyone', 'teen', 'mature', 'adult']);
export const scenePostKind = pgEnum('scene_post_kind', ['ic', 'ooc', 'system']);

/**
 * A piece of roleplay. A scene has exactly one home: a location in a community
 * world, or, when both columns are null, its participants (a private scene).
 */
export const scenes = pgTable(
  'scenes',
  {
    id: id(),
    communityId: uuid('community_id').references(() => communities.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    rating: contentRating('rating').notNull().default('everyone'),
    status: sceneStatus('status').notNull().default('active'),

    // Kept in step with posts in the same transaction as each insert.
    lastSeq: integer('last_seq').notNull().default(0),
    icPostCount: integer('ic_post_count').notNull().default(0),
    lastIcSeq: integer('last_ic_seq').notNull().default(0),
    lastIcAuthorUserId: uuid('last_ic_author_user_id'),
    lastPostAt: timestamptz('last_post_at').notNull().defaultNow(),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('scenes_location_idx').on(t.locationId, t.status, t.lastPostAt), index('scenes_community_idx').on(t.communityId)],
);

/** A person taking part in a scene. In a private scene this row is also what grants access. */
export const sceneParticipants = pgTable(
  'scene_participants',
  {
    sceneId: uuid('scene_id')
      .notNull()
      .references(() => scenes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    invitedByUserId: uuid('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    // The seq of the last post this person has seen. Drives unread counts and "continue reading".
    lastReadSeq: integer('last_read_seq').notNull().default(0),
    joinedAt: timestamptz('joined_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sceneId, t.userId] }), index('scene_participants_user_idx').on(t.userId)],
);

/** A character brought into a scene. One person may bring several. */
export const sceneCharacters = pgTable(
  'scene_characters',
  {
    sceneId: uuid('scene_id')
      .notNull()
      .references(() => scenes.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    addedByUserId: uuid('added_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    joinedAt: timestamptz('joined_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sceneId, t.characterId] })],
);

export const scenePosts = pgTable(
  'scene_posts',
  {
    id: id(),
    sceneId: uuid('scene_id')
      .notNull()
      .references(() => scenes.id, { onDelete: 'cascade' }),
    // Per-scene sequence number shared by every kind of post. Orders the scene and drives pagination.
    seq: integer('seq').notNull(),
    kind: scenePostKind('kind').notNull(),
    // The person accountable for the post. Null only after their account is deleted.
    authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
    // The character speaking. Null on an in-character post means narration.
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
    // Snapshot at post time, so a later rename does not rewrite history.
    characterName: text('character_name'),
    // The editor document is the source of truth; html and text are derived from it on the server.
    contentJson: jsonb('content_json').notNull(),
    contentHtml: text('content_html').notNull(),
    contentText: text('content_text').notNull(),
    createdAt: createdAt(),
    editedAt: timestamptz('edited_at'),
    // A removed post stays as a tombstone so the scene keeps its shape.
    removedAt: timestamptz('removed_at'),
    removedByUserId: uuid('removed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [unique('scene_posts_scene_seq').on(t.sceneId, t.seq), index('scene_posts_kind_idx').on(t.sceneId, t.kind, t.seq)],
);

/**
 * Pictures attached to a story post, in the order they are shown. An image belongs to one post
 * only. The image itself is a row in `media`; removing the post hides its pictures without deleting them.
 */
export const scenePostImages = pgTable(
  'scene_post_images',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => scenePosts.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .unique()
      .references(() => media.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.mediaId] })],
);

/** One unsent post per person per scene, saved as they type. */
export const sceneDrafts = pgTable(
  'scene_drafts',
  {
    sceneId: uuid('scene_id')
      .notNull()
      .references(() => scenes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
    contentJson: jsonb('content_json').notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.sceneId, t.userId] })],
);
