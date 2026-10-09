import { isSeasonMode, seasonForDate, type SeasonKey, type SeasonMode } from '@worldroot/contracts';
import { platformSettings, type Db } from '@worldroot/db';
import { eq } from 'drizzle-orm';
import { recordAudit } from './audit';
import type { Actor } from './authorize';
import { DomainError } from './errors';

const SEASON = 'season';

/**
 * What staff have chosen for the site look: a particular look held on, or
 * `auto` to follow the calendar. Unset, or anything this version does not
 * know, is `auto`.
 */
export async function getSeasonMode(db: Db): Promise<SeasonMode> {
  const [row] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, SEASON));
  return isSeasonMode(row?.value) ? row.value : 'auto';
}

/** The site look in use right now: the one staff chose, or the one the calendar calls for today. */
export async function getSeason(db: Db, now: Date = new Date()): Promise<SeasonKey> {
  const mode = await getSeasonMode(db);
  return mode === 'auto' ? seasonForDate(now) : mode;
}

/** Changes the site look for everyone: one look held on, or `auto` to follow the calendar. WorldRoot staff only. */
export async function setSeason(db: Db, actor: Actor, season: unknown): Promise<SeasonMode> {
  if (actor.platformRole !== 'staff') throw new DomainError('forbidden', 'Only Rootwardens, the WorldRoot staff, can do that.');
  if (!isSeasonMode(season)) throw new DomainError('invalid_input', 'That is not a site look.');
  const before = await getSeasonMode(db);
  if (before === season) return season;
  await db.transaction(async (tx) => {
    await tx
      .insert(platformSettings)
      .values({ key: SEASON, value: season, updatedByUserId: actor.userId })
      .onConflictDoUpdate({ target: platformSettings.key, set: { value: season, updatedByUserId: actor.userId, updatedAt: new Date() } });
    await recordAudit(tx, { actor, action: 'platform.season.set', targetType: 'platform', targetId: SEASON, before: { season: before }, after: { season } });
  });
  return season;
}
