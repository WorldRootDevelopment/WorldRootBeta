import { index, pgEnum, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { createdAt, timestamptz } from './columns';
import { users } from './identity';

export const friendshipStatus = pgEnum('friendship_status', ['pending', 'accepted']);

/**
 * One row per pair of people, written by whoever asked first. While it is
 * pending only the person asked can accept it. Declining, canceling and
 * unfriending all simply remove the row, so nobody is left with a record of
 * having been turned down.
 */
export const friendships = pgTable(
  'friendships',
  {
    requesterUserId: uuid('requester_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addresseeUserId: uuid('addressee_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: friendshipStatus('status').notNull().default('pending'),
    createdAt: createdAt(),
    acceptedAt: timestamptz('accepted_at'),
  },
  (t) => [primaryKey({ columns: [t.requesterUserId, t.addresseeUserId] }), index('friendships_addressee_idx').on(t.addresseeUserId, t.status)],
);
