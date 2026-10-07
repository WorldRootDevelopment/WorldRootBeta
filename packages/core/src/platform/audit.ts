import { auditLog, type Db } from '@worldroot/db';
import type { Actor } from './authorize';

export interface AuditEntry {
  /** Null for actions taken by the system itself. */
  actor: Actor | null;
  /** A dotted action key, such as `profile.create` or `role.update`. */
  action: string;
  targetType: string;
  targetId: string;
  communityId?: string | null;
  before?: unknown;
  after?: unknown;
}

/**
 * Appends to the audit log. Call it with the same transaction as the privileged
 * change it describes, so an action can never happen without its record.
 */
export async function recordAudit(tx: Db, entry: AuditEntry): Promise<void> {
  await tx.insert(auditLog).values({
    actorUserId: entry.actor?.userId ?? null,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    communityId: entry.communityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
}
