import { boolean, index, jsonb, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, timestamptz } from './columns';
import { communities } from './community';
import { users } from './identity';

export const reportStatus = pgEnum('report_status', ['open', 'resolved', 'dismissed']);

/** What a report recorded about its target at the moment it was made. */
export interface ReportSnapshot {
  /** The reported words, kept even if the original is later edited or removed. */
  text: string;
  /** A short description of where it was, such as a scene title or "Lounge". */
  where: string;
  /** A link to the target, for reviewers who are able to open it. */
  href: string | null;
}

/**
 * A report of something a person thinks breaks the rules. It carries a
 * snapshot, because the reported thing may be edited or removed before anyone
 * looks. A community's reviewers see reports about content in their community;
 * WorldRoot staff see the escalated ones and everything outside a community.
 */
export const reports = pgTable(
  'reports',
  {
    id: id(),
    reporterUserId: uuid('reporter_user_id').references(() => users.id, { onDelete: 'set null' }),
    // The person the report is about: the author of the post or message, or the owner of the profile.
    subjectUserId: uuid('subject_user_id').references(() => users.id, { onDelete: 'set null' }),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    // Null for things outside any community: direct messages, private scenes and profiles.
    communityId: uuid('community_id').references(() => communities.id, { onDelete: 'set null' }),
    category: text('category').notNull(),
    note: text('note'),
    snapshot: jsonb('snapshot').$type<ReportSnapshot>().notNull(),
    // True when WorldRoot staff must see it whatever the community does.
    escalated: boolean('escalated').notNull().default(false),
    status: reportStatus('status').notNull().default('open'),
    handledByUserId: uuid('handled_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    resolution: text('resolution'),
    createdAt: createdAt(),
    handledAt: timestamptz('handled_at'),
  },
  (t) => [index('reports_community_idx').on(t.communityId, t.status), index('reports_status_idx').on(t.status, t.escalated)],
);
