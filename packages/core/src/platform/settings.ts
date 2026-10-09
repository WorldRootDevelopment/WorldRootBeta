import { isSeason, type SeasonKey } from '@worldroot/contracts';
import { platformSettings, type Db } from '@worldroot/db';
import { eq } from 'drizzle-orm';
import { recordAudit } from './audit';
import type { Actor } from './authorize';
import { DomainError } from './errors';

const SEASON = 'season';

/** The site look in use. Anything unknown or unset is the standard look. */
export async function getSeason(db: Db): Promise<SeasonKey> {
  const [row] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, SEASON));
  return isSeason(row?.value) ? row.value : 'none';
}

/** Changes the site look for everyone. WorldRoot staff only. */
export async function setSeason(db: Db, actor: Actor, season: unknown): Promise<SeasonKey> {
  if (actor.platformRole !== 'staff') throw new DomainError('forbidden', 'Only WorldRoot staff can do that.');
  if (!isSeason(season)) throw new DomainError('invalid_input', 'That is not a site look.');
  const before = await getSeason(db);
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
