import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, unique, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { createdAt, id, timestamptz, updatedAt } from './columns';
import { communities } from './community';
import { users } from './identity';

/**
 * Library originals and community copies share this table. Exactly one owner
 * column is set. A copy points back at its source and never changes with it.
 */
export const worlds = pgTable(
  'worlds',
  {
    id: id(),
    ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'cascade' }),
    ownerCommunityId: uuid('owner_community_id').references(() => communities.id, { onDelete: 'cascade' }),
    sourceWorldId: uuid('source_world_id').references((): AnyPgColumn => worlds.id, { onDelete: 'set null' }),
    copiedAt: timestamptz('copied_at'),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    summary: text('summary'),
    description: text('description'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('worlds_one_owner', sql`num_nonnulls(${t.ownerUserId}, ${t.ownerCommunityId}) = 1`),
    unique('worlds_community_slug').on(t.ownerCommunityId, t.slug),
    unique('worlds_user_slug').on(t.ownerUserId, t.slug),
  ],
);

/** A tree of places inside a world. Only the name is required. */
export const locations = pgTable(
  'locations',
  {
    id: id(),
    worldId: uuid('world_id')
      .notNull()
      .references(() => worlds.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): AnyPgColumn => locations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    summary: text('summary'),
    description: text('description'),
    position: integer('position').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('locations_world_idx').on(t.worldId, t.parentId, t.position)],
);
