import { BADGES, isBadgeKey, type BadgeKey } from '@worldroot/contracts';
import { redeemCodes, userBadges, type Db } from '@worldroot/db';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { createHash, randomInt } from 'node:crypto';
import { notify } from '../notifications/service';
import { grantHeartwood } from './plan';
import { recordAudit } from '../platform/audit';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';

/**
 * Redeem codes: how people who supported WorldRoot somewhere else, such as on
 * Kickstarter, claim what they were promised here. Kickstarter has no way for
 * another site to check who backed a project, so staff make one code per
 * backer from the backer report and send each backer their own code, through
 * Kickstarter's backer survey or a message. Redeeming it under Settings gives
 * the account whatever the code carries.
 *
 * A code is twelve characters from an alphabet with no look-alikes (no 0/O,
 * 1/I/L), about sixty bits, so guessing one is hopeless. Only its hash is kept.
 */

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const MAX_CODES_PER_BATCH = 5_000;

/** Turns whatever someone typed into the form the code was hashed in: capitals, no spaces, dashes or prefix. */
const normalize = (input: string) => input.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^WR(?=[0-9A-Z]{12}$)/, '');
const hash = (code: string) => createHash('sha256').update(code).digest('hex');

function newCode(): string {
  let raw = '';
  for (let index = 0; index < 12; index += 1) raw += ALPHABET[randomInt(ALPHABET.length)];
  return raw;
}

/** How a code is shown and sent: WR-XXXX-XXXX-XXXX. Typing it with or without the dashes works. */
const pretty = (raw: string) => `WR-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;

const requireStaff = (actor: Actor) => {
  if (actor.platformRole !== 'staff') throw new DomainError('forbidden', 'Only Rootwardens, the WorldRoot staff, can do that.');
};

export interface CodeBatchInput {
  /** What the batch is for, such as "Kickstarter 2026". */
  batch: unknown;
  /** One code is made for each: a backer number, an email, a name. Blank lines are skipped. */
  references: unknown;
  grantsHeartwood: unknown;
  /** Months of Heartwood. Left out or null: Heartwood with no end. */
  grantsMonths?: unknown;
  grantsBadge: unknown;
}

/**
 * Makes a batch of codes, one per reference. The codes are returned this once,
 * for staff to download and send; afterwards only their hashes remain.
 */
export async function createCodeBatch(db: Db, actor: Actor, input: CodeBatchInput): Promise<Array<{ reference: string; code: string }>> {
  requireStaff(actor);
  const batch = typeof input.batch === 'string' ? input.batch.trim() : '';
  if (!batch || batch.length > 80) throw new DomainError('invalid_input', 'Name the batch, in at most 80 characters.', { fields: { batch: 'Name the batch, in at most 80 characters.' } });
  const references = (typeof input.references === 'string' ? input.references.split(/\r?\n/) : [])
    .map((line) => line.trim().slice(0, 200))
    .filter(Boolean);
  if (references.length === 0) throw new DomainError('invalid_input', 'Add at least one line: one code is made for each.', { fields: { references: 'Add at least one line.' } });
  if (references.length > MAX_CODES_PER_BATCH) throw new DomainError('invalid_input', `Make at most ${MAX_CODES_PER_BATCH.toLocaleString('en')} codes at once.`, { fields: { references: 'Too many lines.' } });
  const grantsHeartwood = input.grantsHeartwood === true;
  const grantsMonths = input.grantsMonths === null || input.grantsMonths === undefined || input.grantsMonths === '' ? null : Number(input.grantsMonths);
  if (grantsMonths !== null && (!Number.isInteger(grantsMonths) || grantsMonths < 1 || grantsMonths > 120)) throw new DomainError('invalid_input', 'Give between 1 and 120 months of Heartwood, or no end.');
  const grantsBadge = input.grantsBadge ? String(input.grantsBadge) : null;
  if (grantsBadge && (!isBadgeKey(grantsBadge) || !BADGES[grantsBadge].grantable)) throw new DomainError('invalid_input', 'That badge cannot be given by a code.');
  if (!grantsHeartwood && !grantsBadge) throw new DomainError('invalid_input', 'A code has to give something: Heartwood, a badge, or both.');

  const made = references.map((reference) => ({ reference, raw: newCode() }));
  await db.transaction(async (tx) => {
    // Inserted in slices, so a large batch stays within the database's limits on one statement.
    for (let at = 0; at < made.length; at += 500) {
      await tx.insert(redeemCodes).values(
        made.slice(at, at + 500).map(({ reference, raw }) => ({ codeHash: hash(raw), batch, reference, grantsHeartwood, grantsMonths: grantsHeartwood ? grantsMonths : null, grantsBadge, createdByUserId: actor.userId })),
      );
    }
    await recordAudit(tx, { actor, action: 'platform.codes.create', targetType: 'code_batch', targetId: batch, after: { count: made.length, grantsHeartwood, grantsMonths, grantsBadge } });
  });
  return made.map(({ reference, raw }) => ({ reference, code: pretty(raw) }));
}

export interface CodeBatchSummary {
  batch: string;
  total: number;
  redeemed: number;
  grantsHeartwood: boolean;
  /** Months of Heartwood each code gives. Null: no end. */
  grantsMonths: number | null;
  grantsBadge: BadgeKey | null;
  createdAt: Date;
}

/** Each batch with how many of its codes have been used. Staff only. */
export async function listCodeBatches(db: Db, actor: Actor): Promise<CodeBatchSummary[]> {
  requireStaff(actor);
  const rows = await db
    .select({
      batch: redeemCodes.batch,
      total: count(),
      redeemed: sql<number>`count(${redeemCodes.redeemedAt})::int`,
      grantsHeartwood: sql<boolean>`bool_or(${redeemCodes.grantsHeartwood})`,
      grantsMonths: sql<number | null>`max(${redeemCodes.grantsMonths})`,
      grantsBadge: sql<string | null>`max(${redeemCodes.grantsBadge})`,
      createdAt: sql<Date>`min(${redeemCodes.createdAt})`,
    })
    .from(redeemCodes)
    .groupBy(redeemCodes.batch)
    .orderBy(desc(sql`min(${redeemCodes.createdAt})`));
  return rows.map((row) => ({ ...row, createdAt: new Date(row.createdAt), grantsBadge: isBadgeKey(row.grantsBadge) ? row.grantsBadge : null }));
}

export interface Redeemed {
  heartwood: boolean;
  /** Months of Heartwood given. Null when it has no end, or when the code gave none. */
  months: number | null;
  badge: BadgeKey | null;
}

/**
 * Redeems a code for the actor's account. Each code works once, for whoever
 * enters it first. A wrong code and a used one get the same answer, so the
 * message tells a guesser nothing.
 */
export async function redeemCode(db: Db, actor: Actor, input: unknown): Promise<Redeemed> {
  const raw = typeof input === 'string' ? normalize(input) : '';
  const refused = new DomainError('not_found', 'That code does not work. Check it and try again, or contact WorldRoot if you think it should.', {
    fields: { code: 'That code does not work.' },
  });
  if (raw.length !== 12) throw refused;

  return db.transaction(async (tx) => {
    // Claimed and marked in one step, so two people entering the same code at once cannot both have it.
    const [code] = await tx
      .update(redeemCodes)
      .set({ redeemedByUserId: actor.userId, redeemedAt: new Date() })
      .where(and(eq(redeemCodes.codeHash, hash(raw)), isNull(redeemCodes.redeemedAt)))
      .returning();
    if (!code) throw refused;

    const badge = isBadgeKey(code.grantsBadge) ? code.grantsBadge : null;
    if (code.grantsHeartwood) {
      // Added to any Heartwood already running; a code with no end makes it endless.
      const { started } = await grantHeartwood(tx, actor.userId, code.grantsMonths);
      if (started) await notify(tx, { userId: actor.userId, type: 'badge.granted', groupKey: 'badge:premium', subject: BADGES.premium.label, href: '/store' });
    }
    if (badge) {
      const [added] = await tx.insert(userBadges).values({ userId: actor.userId, badge }).onConflictDoNothing().returning({ badge: userBadges.badge });
      if (added) await notify(tx, { userId: actor.userId, type: 'badge.granted', groupKey: `badge:${badge}`, subject: BADGES[badge].label, href: '/settings/badges' });
    }
    await recordAudit(tx, { actor, action: 'platform.codes.redeem', targetType: 'user', targetId: actor.userId, after: { batch: code.batch, heartwood: code.grantsHeartwood, badge } });
    return { heartwood: code.grantsHeartwood, months: code.grantsHeartwood ? code.grantsMonths : null, badge };
  });
}
