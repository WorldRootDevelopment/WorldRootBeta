import { index, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, timestamptz } from './columns';
import { users } from './identity';

/**
 * Badges granted to an account by WorldRoot staff, such as "Founder" or
 * "Beta tester". The Staff and Premium badges are not stored here: they are
 * derived from the account itself, so they can never be out of step with it.
 */
/**
 * What a person owns from the store, such as a dice theme. `itemKey` is a key from the store
 * registry in @worldroot/contracts. `source` says how they came by it: given by staff today,
 * bought or earned once the store can take payment or points.
 */
export const userItems = pgTable(
  'user_items',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemKey: text('item_key').notNull(),
    source: text('source').notNull().default('grant'),
    grantedByUserId: uuid('granted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemKey] })],
);

export const userBadges = pgTable(
  'user_badges',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // A key from the badge registry in @worldroot/contracts.
    badge: text('badge').notNull(),
    grantedByUserId: uuid('granted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badge] })],
);

/**
 * Handles people used to have. A link to an old handle still finds its owner,
 * and nobody else can take the name while it is held here.
 */
export const handleHistory = pgTable(
  'handle_history',
  {
    handleLower: text('handle_lower').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    changedAt: timestamptz('changed_at').notNull().defaultNow(),
  },
  (t) => [index('handle_history_user_idx').on(t.userId)],
);

/** One person blocking another. Either direction closes private contact between the two. */
export const userBlocks = pgTable(
  'user_blocks',
  {
    blockerUserId: uuid('blocker_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedUserId: uuid('blocked_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.blockerUserId, t.blockedUserId] }), index('user_blocks_blocked_idx').on(t.blockedUserId)],
);
