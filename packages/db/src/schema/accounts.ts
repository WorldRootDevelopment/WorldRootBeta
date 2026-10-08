import { index, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, timestamptz } from './columns';
import { users } from './identity';

/**
 * Badges granted to an account by WorldRoot staff, such as "Founder" or
 * "Beta tester". The Staff and Premium badges are not stored here: they are
 * derived from the account itself, so they can never be out of step with it.
 */
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
