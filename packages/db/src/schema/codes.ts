import { boolean, index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, timestamptz } from './columns';
import { users } from './identity';

/**
 * One-use codes that give whoever redeems them something: Heartwood, a badge,
 * or both. Made by staff in batches, such as one per Kickstarter backer, and
 * sent to people outside WorldRoot. Only a hash of each code is kept, so a
 * leak of this table gives away no codes.
 */
export const redeemCodes = pgTable(
  'redeem_codes',
  {
    id: id(),
    codeHash: text('code_hash').notNull().unique(),
    // The batch it was made in, such as "Kickstarter 2026".
    batch: text('batch').notNull(),
    // Who it was made for, for staff to look up: a backer number, a name. Never shown to the person redeeming it.
    reference: text('reference'),
    grantsHeartwood: boolean('grants_heartwood').notNull().default(false),
    // How many months of Heartwood. Null: Heartwood with no end.
    grantsMonths: integer('grants_months'),
    // A key from the badge registry in @worldroot/contracts, or null.
    grantsBadge: text('grants_badge'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    redeemedByUserId: uuid('redeemed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    redeemedAt: timestamptz('redeemed_at'),
  },
  (t) => [index('redeem_codes_batch_idx').on(t.batch)],
);
