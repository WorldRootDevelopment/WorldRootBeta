import { DEFAULT_DICE_THEME, isStoreItem, STORE_ITEMS, type StoreItem } from '@worldroot/contracts';
import { profiles, userItems, users, type Db } from '@worldroot/db';
import { and, eq } from 'drizzle-orm';
import { recordAudit } from '../platform/audit';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';

/** The keys of everything a person owns from the store. */
export async function listOwnedItems(db: Db, userId: string): Promise<string[]> {
  const rows = await db.select({ itemKey: userItems.itemKey }).from(userItems).where(eq(userItems.userId, userId));
  // An item taken out of the catalogue is no longer something anyone has.
  return rows.map((row) => row.itemKey).filter(isStoreItem);
}

export async function ownsItem(db: Db, userId: string, itemKey: string): Promise<boolean> {
  const [row] = await db
    .select({ itemKey: userItems.itemKey })
    .from(userItems)
    .where(and(eq(userItems.userId, userId), eq(userItems.itemKey, itemKey)));
  return Boolean(row);
}

export interface StoreView {
  items: Array<StoreItem & { owned: boolean }>;
}

/** The catalogue as one person sees it: every item, and whether they have it. */
export async function getStore(db: Db, actor: Actor): Promise<StoreView> {
  const owned = new Set(await listOwnedItems(db, actor.userId));
  return { items: STORE_ITEMS.map((item) => ({ ...item, owned: owned.has(item.key) })) };
}

/**
 * Gives someone a store item, or takes it back. WorldRoot staff only, and
 * recorded. This is the only way to own an item until the store can take
 * payment or points; a purchase will add a row the same way with its own
 * `source`.
 */
export async function setItemOwned(db: Db, actor: Actor, userId: string, itemKey: string, owned: boolean): Promise<void> {
  if (actor.platformRole !== 'staff') throw new DomainError('forbidden', 'Only Rootwardens, the WorldRoot staff, can do that.');
  const item = STORE_ITEMS.find((candidate) => candidate.key === itemKey);
  if (!item) throw new DomainError('invalid_input', 'That is not in the store.');
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!user) throw new DomainError('not_found', 'That account does not exist.');

  await db.transaction(async (tx) => {
    const changed = owned
      ? await tx.insert(userItems).values({ userId, itemKey, source: 'grant', grantedByUserId: actor.userId }).onConflictDoNothing().returning({ itemKey: userItems.itemKey })
      : await tx.delete(userItems).where(and(eq(userItems.userId, userId), eq(userItems.itemKey, itemKey))).returning({ itemKey: userItems.itemKey });
    if (changed.length === 0) return;
    // Dice they no longer own go back to the plain set.
    if (!owned) await tx.update(profiles).set({ diceTheme: DEFAULT_DICE_THEME }).where(and(eq(profiles.userId, userId), eq(profiles.diceTheme, item.theme)));
    await recordAudit(tx, { actor, action: owned ? 'platform.item.grant' : 'platform.item.revoke', targetType: 'user', targetId: userId, after: { item: itemKey } });
  });
}
