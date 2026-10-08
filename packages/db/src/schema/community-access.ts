import { index, integer, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, timestamptz } from './columns';
import { communities } from './community';
import { users } from './identity';

/** A link that lets whoever holds it join a community, listed or not. */
export const communityInvites = pgTable(
  'community_invites',
  {
    id: id(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    // The secret in the link. Unguessable, and the only thing needed to join.
    code: text('code').notNull().unique(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    // Null means no limit.
    maxUses: integer('max_uses'),
    uses: integer('uses').notNull().default(0),
    // Null means it does not expire.
    expiresAt: timestamptz('expires_at'),
    revokedAt: timestamptz('revoked_at'),
    createdAt: createdAt(),
  },
  (t) => [index('community_invites_community_idx').on(t.communityId, t.createdAt)],
);

/** Someone removed from a community and prevented from rejoining, by link or otherwise. */
export const communityBans = pgTable(
  'community_bans',
  {
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bannedByUserId: uuid('banned_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    reason: text('reason'),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.communityId, t.userId] })],
);
