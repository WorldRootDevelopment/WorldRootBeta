import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, timestamptz } from './columns';
import { users } from './identity';

/**
 * Domain events, written in the same transaction as the change that caused them
 * and delivered to consumers afterwards by the worker.
 */
export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: id(),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: createdAt(),
    processedAt: timestamptz('processed_at'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
  },
  (t) => [index('outbox_events_pending_idx').on(t.id).where(sql`${t.processedAt} is null`)],
);

/** Append-only record of privileged actions. Rows are never updated or deleted. */
export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    // Null for platform-level entries. Gains a foreign key when communities exist.
    communityId: uuid('community_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_log_community_idx').on(t.communityId, t.createdAt),
    index('audit_log_target_idx').on(t.targetType, t.targetId),
  ],
);
