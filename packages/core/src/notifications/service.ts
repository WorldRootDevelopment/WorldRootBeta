import type { NotificationType, PermissionKey } from '@worldroot/contracts';
import { communityMembers, notifications, profiles, roleAssignments, roles, userBlocks, users, type Db } from '@worldroot/db';
import { and, count, desc, eq, isNull, or, sql } from 'drizzle-orm';
import type { Actor } from '../platform/authorize';

export type Notification = typeof notifications.$inferSelect;

/** How many names a grouped notification keeps. The count carries the rest. */
const MAX_ACTORS = 3;

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  /** Events sharing this key fold into one notification while it is unread. */
  groupKey: string;
  subject: string;
  href: string;
  /** Who caused it. Omitted for notices from WorldRoot itself. Never notified about their own action. */
  actorUserId?: string | null;
  preview?: string | null;
}

/**
 * Tells one person about something. Call it in the same transaction as the
 * change, so a notification can never describe something that did not happen.
 * Nothing is sent to the person who caused it, or across a block.
 */
export async function notify(tx: Db, input: NotifyInput): Promise<void> {
  const actorId = input.actorUserId ?? null;
  if (actorId === input.userId) return;

  let actorName: string | null = null;
  if (actorId) {
    const [blocked] = await tx
      .select({ blocker: userBlocks.blockerUserId })
      .from(userBlocks)
      .where(
        or(
          and(eq(userBlocks.blockerUserId, actorId), eq(userBlocks.blockedUserId, input.userId)),
          and(eq(userBlocks.blockerUserId, input.userId), eq(userBlocks.blockedUserId, actorId)),
        ),
      );
    if (blocked) return;
    const [profile] = await tx.select({ displayName: profiles.displayName }).from(profiles).where(eq(profiles.userId, actorId));
    actorName = profile?.displayName ?? null;
  }
  const preview = input.preview ? input.preview.replace(/\s+/g, ' ').trim().slice(0, 160) || null : null;

  const [open] = await tx
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, input.userId), eq(notifications.groupKey, input.groupKey), isNull(notifications.readAt)));
  if (open) {
    const actors = actorName ? [actorName, ...open.actors.filter((name) => name !== actorName)].slice(0, MAX_ACTORS) : open.actors;
    await tx
      .update(notifications)
      .set({ count: open.count + 1, actors, preview: preview ?? open.preview, href: input.href, subject: input.subject, updatedAt: new Date() })
      .where(eq(notifications.id, open.id));
    return;
  }
  await tx.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    groupKey: input.groupKey,
    subject: input.subject,
    actors: actorName ? [actorName] : [],
    preview,
    href: input.href,
  });
}

/** Tells several people the same thing. */
export async function notifyMany(tx: Db, userIds: readonly string[], input: Omit<NotifyInput, 'userId'>): Promise<void> {
  for (const userId of new Set(userIds)) await notify(tx, { ...input, userId });
}

/** Everyone in a community whose roles grant a permission, owners included. Used to reach reviewers and moderators. */
export async function membersWithPermission(db: Db, communityId: string, permission: PermissionKey): Promise<string[]> {
  const rows = await db
    .select({ userId: roleAssignments.userId })
    .from(roleAssignments)
    .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
    .where(and(eq(roleAssignments.communityId, communityId), or(eq(roles.isOwner, true), sql`${permission} = any(${roles.permissions})`)));
  return [...new Set(rows.map((row) => row.userId))];
}

export async function communityMemberIds(db: Db, communityId: string): Promise<string[]> {
  return (await db.select({ userId: communityMembers.userId }).from(communityMembers).where(eq(communityMembers.communityId, communityId))).map(
    (row) => row.userId,
  );
}

export async function staffIds(db: Db): Promise<string[]> {
  return (await db.select({ id: users.id }).from(users).where(eq(users.platformRole, 'staff'))).map((row) => row.id);
}

/** The actor's notifications, most recently active first. */
export async function listNotifications(db: Db, actor: Actor, limit = 50): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, actor.userId))
    .orderBy(desc(notifications.updatedAt), desc(notifications.id))
    .limit(Math.min(limit, 100));
}

export async function countUnreadNotifications(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.value ?? 0;
}

/** Marks one of the actor's notifications read, or all of them when no id is given. */
export async function markNotificationsRead(db: Db, actor: Actor, notificationId?: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, actor.userId), isNull(notifications.readAt), notificationId ? eq(notifications.id, notificationId) : undefined),
    );
}
