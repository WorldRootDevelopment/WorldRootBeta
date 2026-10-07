import type { DomainEvent, EventPayloads, EventType } from '@worldroot/contracts';
import { outboxEvents, type Db } from '@worldroot/db';
import { and, asc, eq, isNull, lt, sql } from 'drizzle-orm';

const MAX_ATTEMPTS = 5;

/**
 * Records a domain event. Call it with the same transaction as the change that
 * caused the event, so the two commit or roll back together.
 */
export async function emitEvent<T extends EventType>(tx: Db, type: T, payload: EventPayloads[T]): Promise<void> {
  await tx.insert(outboxEvents).values({ type, payload });
}

export type EventHandler<T extends EventType = EventType> = (event: DomainEvent<T>, tx: Db) => Promise<void>;

export type EventHandlers = { [T in EventType]?: EventHandler<T>[] };

export interface OutboxResult {
  processed: number;
  failed: number;
}

/**
 * Delivers one batch of pending events to their handlers, oldest first.
 * Rows are locked with SKIP LOCKED so several workers can run side by side.
 * A handler that throws rolls back only its own writes; the event is retried
 * on a later pass, up to MAX_ATTEMPTS.
 */
export async function processOutbox(db: Db, handlers: EventHandlers, batchSize = 50): Promise<OutboxResult> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(outboxEvents)
      .where(and(isNull(outboxEvents.processedAt), lt(outboxEvents.attempts, MAX_ATTEMPTS)))
      .orderBy(asc(outboxEvents.id))
      .limit(batchSize)
      .for('update', { skipLocked: true });

    const result: OutboxResult = { processed: 0, failed: 0 };

    for (const row of rows) {
      const event = { id: row.id, type: row.type, payload: row.payload, createdAt: row.createdAt } as DomainEvent;
      const eventHandlers = (handlers[event.type] ?? []) as EventHandler[];
      try {
        await tx.transaction(async (savepoint) => {
          for (const handler of eventHandlers) await handler(event, savepoint);
        });
        await tx.update(outboxEvents).set({ processedAt: new Date() }).where(eq(outboxEvents.id, row.id));
        result.processed += 1;
      } catch (error) {
        await tx
          .update(outboxEvents)
          .set({
            attempts: sql`${outboxEvents.attempts} + 1`,
            lastError: error instanceof Error ? error.message : String(error),
          })
          .where(eq(outboxEvents.id, row.id));
        result.failed += 1;
      }
    }

    return result;
  });
}
