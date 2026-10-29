import { boolean, index, integer, jsonb, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { characters } from './characters';
import { createdAt, id, timestamptz, updatedAt } from './columns';
import { users } from './identity';
import { contentRating } from './scenes';
import { worlds } from './worlds';

/**
 * A story one person writes on their own: a title, a summary and chapters,
 * with the characters in it tagged. Unlike a scene, nobody else writes in it.
 */
export const stories = pgTable(
  'stories',
  {
    id: id(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    summary: text('summary'),
    rating: contentRating('rating').notNull().default('everyone'),
    // 'private': the writer alone. 'unlisted': anyone signed in who has the link. 'public': also listed on their profile.
    visibility: text('visibility').notNull().default('private'),
    // One of the writer's own library worlds, if the story is set in one.
    worldId: uuid('world_id').references(() => worlds.id, { onDelete: 'set null' }),
    // Readers may comment on its chapters. The writer can close comments.
    commentsOpen: boolean('comments_open').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('stories_owner_idx').on(t.ownerUserId, t.updatedAt)],
);

/** One chapter of a story. The editor document is the source of truth; html and text are derived from it on the server. */
export const storyChapters = pgTable(
  'story_chapters',
  {
    id: id(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    title: text('title'),
    contentJson: jsonb('content_json').notNull(),
    contentHtml: text('content_html').notNull().default(''),
    contentText: text('content_text').notNull().default(''),
    wordCount: integer('word_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('story_chapters_order_idx').on(t.storyId, t.position)],
);

/** The writer's own characters who appear in a story. */
export const storyCharacters = pgTable(
  'story_characters',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.characterId] }), index('story_characters_character_idx').on(t.characterId)],
);

/** Kudos: one reader saying they liked a story. One per reader per story. */
export const storyKudos = pgTable(
  'story_kudos',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.userId] })],
);

/** A reader's comment on one chapter. A removed comment is kept, unseen, for staff looking into a report. */
export const storyComments = pgTable(
  'story_comments',
  {
    id: id(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => storyChapters.id, { onDelete: 'cascade' }),
    authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    createdAt: createdAt(),
    removedAt: timestamptz('removed_at'),
    removedByUserId: uuid('removed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [index('story_comments_chapter_idx').on(t.chapterId, t.createdAt)],
);
