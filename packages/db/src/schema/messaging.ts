import { index, pgEnum, pgTable, primaryKey, text, unique, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, timestamptz } from './columns';
import { communities } from './community';
import { users } from './identity';

export const conversationKind = pgEnum('conversation_kind', ['direct', 'group', 'community']);

/**
 * A first message between strangers is a request: `pending` until the recipient
 * answers, `declined` if they refuse. Conversations between people who share a
 * community, and all groups and community spaces, are `none`.
 */
export const messageRequestState = pgEnum('message_request_state', ['none', 'pending', 'declined']);

/**
 * One engine for three things: a direct conversation between two people, a
 * small group, and a community's built-in spaces (Announcements and the Lounge).
 * Deliberately plainer than scenes: this is for coordination, not roleplay.
 */
export const conversations = pgTable(
  'conversations',
  {
    id: id(),
    kind: conversationKind('kind').notNull(),
    // Set for community spaces only.
    communityId: uuid('community_id').references(() => communities.id, { onDelete: 'cascade' }),
    // Which built-in space this is: 'announcements' or 'lounge'.
    spaceKey: text('space_key'),
    // For direct conversations: both user ids, sorted and joined. Guarantees one conversation per pair.
    directKey: text('direct_key').unique(),
    // An optional name for a group.
    title: text('title'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    requestState: messageRequestState('request_state').notNull().default('none'),
    // Who sent the request. The other person is the one who accepts or declines.
    requestedByUserId: uuid('requested_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    lastMessageId: uuid('last_message_id'),
    lastMessageAt: timestamptz('last_message_at'),
    createdAt: createdAt(),
  },
  (t) => [unique('conversations_community_space').on(t.communityId, t.spaceKey)],
);

/**
 * Who is in a direct or group conversation, and how far each person has read.
 * Community spaces take their audience from community membership; a row here
 * only records a member's read position.
 */
export const conversationMembers = pgTable(
  'conversation_members',
  {
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Message ids are time-ordered, so "unread" is any message with a greater id.
    lastReadMessageId: uuid('last_read_message_id'),
    joinedAt: timestamptz('joined_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] }), index('conversation_members_user_idx').on(t.userId)],
);

export const messages = pgTable(
  'messages',
  {
    id: id(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
    // Plain text. Line breaks are kept; nothing else is interpreted.
    body: text('body').notNull(),
    createdAt: createdAt(),
    removedAt: timestamptz('removed_at'),
    removedByUserId: uuid('removed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [index('messages_conversation_idx').on(t.conversationId, t.id)],
);
