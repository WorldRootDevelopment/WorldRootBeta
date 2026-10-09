import { index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, timestamptz } from './columns';
import { users } from './identity';

/**
 * A "Looking for RP" listing: a writer saying what they would like to write
 * and with whom. It lapses by itself, so the board never fills with requests
 * from people who left months ago.
 */
export const lfrpListings = pgTable(
  'lfrp_listings',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    // Keys from the registries in @worldroot/contracts.
    genres: jsonb('genres').$type<string[]>().notNull().default([]),
    kind: text('kind').notNull(),
    pace: text('pace').notNull(),
    rating: text('rating').notNull(),
    createdAt: createdAt(),
    expiresAt: timestamptz('expires_at').notNull(),
  },
  (t) => [index('lfrp_listings_user_idx').on(t.userId), index('lfrp_listings_expires_idx').on(t.expiresAt)],
);
