import { createProfileSchema, type CreateProfileInput, type Profile } from '@worldroot/contracts';
import { profiles, type Db } from '@worldroot/db';
import { eq } from 'drizzle-orm';
import { recordAudit } from '../platform/audit';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { emitEvent } from '../platform/outbox';

const toProfile = (row: typeof profiles.$inferSelect): Profile => ({
  userId: row.userId,
  handle: row.handle,
  displayName: row.displayName,
  pronouns: row.pronouns,
  bio: row.bio,
});

export async function getProfile(db: Db, userId: string): Promise<Profile | null> {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return row ? toProfile(row) : null;
}

export async function getProfileByHandle(db: Db, handle: string): Promise<Profile | null> {
  const [row] = await db.select().from(profiles).where(eq(profiles.handleLower, handle.toLowerCase())).limit(1);
  return row ? toProfile(row) : null;
}

/** Onboarding: the actor picks a handle and confirms they are an adult. Runs once per account. */
export async function createProfile(db: Db, actor: Actor, input: CreateProfileInput): Promise<Profile> {
  const parsed = createProfileSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'form')] ??= issue.message;
    throw new DomainError('invalid_input', 'Check the highlighted fields.', { fields });
  }
  const { handle, displayName } = parsed.data;

  return db.transaction(async (tx) => {
    if (await getProfile(tx, actor.userId)) {
      throw new DomainError('conflict', 'This account already has a profile.');
    }
    if (await getProfileByHandle(tx, handle)) {
      throw new DomainError('conflict', 'That handle is taken.', { fields: { handle: 'That handle is taken.' } });
    }

    const [row] = await tx
      .insert(profiles)
      .values({
        userId: actor.userId,
        handle,
        handleLower: handle.toLowerCase(),
        displayName,
        adultConfirmedAt: new Date(),
      })
      .returning();
    const profile = toProfile(row!);

    await recordAudit(tx, {
      actor,
      action: 'profile.create',
      targetType: 'profile',
      targetId: actor.userId,
      after: { handle: profile.handle, displayName: profile.displayName, adultConfirmed: true },
    });
    await emitEvent(tx, 'user.onboarded', { userId: actor.userId });

    return profile;
  });
}
