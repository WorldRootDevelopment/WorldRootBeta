import { handleSchema, type Profile } from '@worldroot/contracts';
import { accounts, communityMembers, handleHistory, profiles, friendships, userBlocks, users, type Db } from '@worldroot/db';
import { and, eq, inArray, or } from 'drizzle-orm';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { getProfile } from './profile';

/** How long a person waits between changes of handle. Staff are exempt. */
export const HANDLE_COOLDOWN_DAYS = 14;

/**
 * Changes the actor's handle. The old one is kept in their name: links to it
 * still find them, and nobody else can take it.
 */
export async function changeHandle(db: Db, actor: Actor, input: unknown): Promise<Profile> {
  const parsed = handleSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'That handle cannot be used.';
    throw new DomainError('invalid_input', message, { fields: { handle: message } });
  }
  const handle = parsed.data;
  const lower = handle.toLowerCase();
  const refuse = (message: string, code: 'conflict' | 'invalid_input' = 'conflict') => new DomainError(code, message, { fields: { handle: message } });

  return db.transaction(async (tx) => {
    const [mine] = await tx.select().from(profiles).where(eq(profiles.userId, actor.userId));
    if (!mine) throw new DomainError('not_found', 'Finish setting up your account first.');
    if (mine.handle === handle) return (await getProfile(tx, actor.userId))!;

    // Changing only the capitals is not a new handle, so it is always allowed.
    const onlyCase = mine.handleLower === lower;
    if (!onlyCase) {
      const waited = mine.handleChangedAt ? (Date.now() - mine.handleChangedAt.getTime()) / 86_400_000 : Infinity;
      if (waited < HANDLE_COOLDOWN_DAYS && actor.platformRole !== 'staff') {
        const days = Math.ceil(HANDLE_COOLDOWN_DAYS - waited);
        throw refuse(`You changed your handle recently. You can change it again in ${days} ${days === 1 ? 'day' : 'days'}.`);
      }
      const [taken] = await tx.select({ userId: profiles.userId }).from(profiles).where(eq(profiles.handleLower, lower));
      const [held] = await tx.select().from(handleHistory).where(eq(handleHistory.handleLower, lower));
      if (taken || (held && held.userId !== actor.userId)) throw refuse('That handle is taken.');

      // Taking back one of your own old handles releases it from the history.
      if (held) await tx.delete(handleHistory).where(eq(handleHistory.handleLower, lower));
      await tx.insert(handleHistory).values({ handleLower: mine.handleLower, userId: actor.userId }).onConflictDoNothing();
    }

    await tx
      .update(profiles)
      .set({ handle, handleLower: lower, ...(onlyCase ? {} : { handleChangedAt: new Date() }) })
      .where(eq(profiles.userId, actor.userId));
    return (await getProfile(tx, actor.userId))!;
  });
}

/** The account details a person may see about themselves. */
export async function getAccount(db: Db, actor: Actor): Promise<{ email: string; handleChangedAt: Date | null; nextHandleChange: Date | null }> {
  const [row] = await db
    .select({ email: users.email, handleChangedAt: profiles.handleChangedAt })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, actor.userId));
  if (!row) throw new DomainError('not_found', 'That account does not exist.');
  const next = row.handleChangedAt ? new Date(row.handleChangedAt.getTime() + HANDLE_COOLDOWN_DAYS * 86_400_000) : null;
  return {
    email: row.email,
    handleChangedAt: row.handleChangedAt,
    nextHandleChange: next && next.getTime() > Date.now() && actor.platformRole !== 'staff' ? next : null,
  };
}

/** True when either person has blocked the other. A block closes private contact in both directions. */
export async function isBlockedBetween(db: Db, a: string, b: string): Promise<boolean> {
  const [row] = await db
    .select({ blocker: userBlocks.blockerUserId })
    .from(userBlocks)
    .where(
      or(
        and(eq(userBlocks.blockerUserId, a), eq(userBlocks.blockedUserId, b)),
        and(eq(userBlocks.blockerUserId, b), eq(userBlocks.blockedUserId, a)),
      ),
    );
  return Boolean(row);
}

/** Blocks someone. They are not told. Existing conversations with them stop accepting messages. */
export async function blockUser(db: Db, actor: Actor, userId: string): Promise<void> {
  if (userId === actor.userId) throw new DomainError('invalid_input', 'You cannot block yourself.');
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!target) throw new DomainError('not_found', 'That account does not exist.');
  await db.insert(userBlocks).values({ blockerUserId: actor.userId, blockedUserId: userId }).onConflictDoNothing();
  // Blocking a friend ends the friendship, and drops any request waiting between the two.
  await db
    .delete(friendships)
    .where(
      or(
        and(eq(friendships.requesterUserId, actor.userId), eq(friendships.addresseeUserId, userId)),
        and(eq(friendships.requesterUserId, userId), eq(friendships.addresseeUserId, actor.userId)),
      ),
    );
}

export async function unblockUser(db: Db, actor: Actor, userId: string): Promise<void> {
  await db.delete(userBlocks).where(and(eq(userBlocks.blockerUserId, actor.userId), eq(userBlocks.blockedUserId, userId)));
}

export interface BlockedPerson {
  userId: string;
  handle: string;
  displayName: string;
}

/** The people the actor has blocked. Who has blocked the actor is never revealed. */
export async function listBlocked(db: Db, actor: Actor): Promise<BlockedPerson[]> {
  return db
    .select({ userId: profiles.userId, handle: profiles.handle, displayName: profiles.displayName })
    .from(userBlocks)
    .innerJoin(profiles, eq(profiles.userId, userBlocks.blockedUserId))
    .where(eq(userBlocks.blockerUserId, actor.userId))
    .orderBy(profiles.handleLower);
}

/** Whether the actor has blocked this person. Only the actor's own side is reported. */
export async function hasBlocked(db: Db, actor: Actor, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ blocked: userBlocks.blockedUserId })
    .from(userBlocks)
    .where(and(eq(userBlocks.blockerUserId, actor.userId), eq(userBlocks.blockedUserId, userId)));
  return Boolean(row);
}

/** True when two people belong to at least one community together. Strangers start with a message request. */
export async function shareCommunity(db: Db, a: string, b: string): Promise<boolean> {
  const mine = await db.select({ id: communityMembers.communityId }).from(communityMembers).where(eq(communityMembers.userId, a));
  if (mine.length === 0) return false;
  const [shared] = await db
    .select({ id: communityMembers.communityId })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.userId, b),
        inArray(
          communityMembers.communityId,
          mine.map((row) => row.id),
        ),
      ),
    )
    .limit(1);
  return Boolean(shared);
}

export interface SignInMethod {
  /** `credential` for a password, otherwise the provider's name, such as `discord` or `google`. */
  provider: string;
  /** The id of this connection, needed to disconnect it. */
  id: string;
}

/** The ways an account can sign in: a password, and each provider connected to it. */
export async function listSignInMethods(db: Db, actor: Actor): Promise<SignInMethod[]> {
  const rows = await db.select({ id: accounts.id, provider: accounts.providerId }).from(accounts).where(eq(accounts.userId, actor.userId));
  return rows.sort((a, b) => a.provider.localeCompare(b.provider));
}
