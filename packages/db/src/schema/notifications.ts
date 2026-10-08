import { index, integer, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, timestamptz } from './columns';
import { users } from './identity';

/**
 * Something a person should know about. Events of the same kind about the
 * same thing share a `groupKey`: while one is unread, the next folds into it,
 * so ten posts in one scene are one line with a count, not ten lines.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // A key from the notification registry in @worldroot/contracts.
    type: text('type').notNull(),
    groupKey: text('group_key').notNull(),
    // What it is about: a scene title, a community name, a character name.
    subject: text('subject').notNull(),
    // Display names of the most recent people involved, newest first. Empty for notices from WorldRoot itself.
    actors: jsonb('actors').$type<string[]>().notNull().default([]),
    count: integer('count').notNull().default(1),
    preview: text('preview'),
    href: text('href').notNull(),
    readAt: timestamptz('read_at'),
    createdAt: createdAt(),
    // Moves forward each time another event folds in, so the list stays in order of latest activity.
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.updatedAt), index('notifications_group_idx').on(t.userId, t.groupKey)],
);
