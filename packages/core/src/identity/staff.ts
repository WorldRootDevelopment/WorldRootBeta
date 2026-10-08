import { accounts, auditLog, users, type Db } from '@worldroot/db';
import { and, eq } from 'drizzle-orm';
import { recordAudit } from '../platform/audit';
import { createAuth } from './auth';

export interface PlatformAdminConfig {
  email: string;
  /** Used to create the account when it does not exist yet. */
  password?: string;
  /**
   * Also apply `password` to an account that already exists, when it differs. This happens once per
   * account: after that the settings file is ignored, so a password changed in the app stays changed.
   * Off by default: an existing account keeps the password its owner chose.
   * Meant for a developer's own machine, where the settings file is the
   * easiest place to keep the administrator's password.
   */
  syncPassword?: boolean;
}

export interface PlatformAdminResult {
  userId: string;
  /** The account did not exist and was created. */
  created: boolean;
  /** The account was not staff before this call. */
  promoted: boolean;
  /** The account existed and its password was replaced with the configured one. */
  passwordSet: boolean;
}

const authFor = (db: Db) =>
  createAuth({
    db,
    secret: process.env.BETTER_AUTH_SECRET ?? 'dev-only-secret-change-me',
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  });

/** Replaces an account's password, unless it already is that password. Returns whether anything changed. */
async function setPassword(db: Db, userId: string, password: string): Promise<boolean> {
  // Applied once only. After that the person's own choice, made in the app, is what counts.
  const [already] = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(and(eq(auditLog.action, 'platform.staff.password_set'), eq(auditLog.targetId, userId)));
  if (already) return false;

  const { password: hasher } = await authFor(db).$context;
  const credential = and(eq(accounts.userId, userId), eq(accounts.providerId, 'credential'));
  const [existing] = await db.select().from(accounts).where(credential);
  if (existing?.password && (await hasher.verify({ hash: existing.password, password }))) return false;

  const hash = await hasher.hash(password);
  await db.transaction(async (tx) => {
    if (existing) await tx.update(accounts).set({ password: hash }).where(credential);
    // An account made through Discord or Google has no password row yet.
    else await tx.insert(accounts).values({ userId, accountId: userId, providerId: 'credential', password: hash });
    await recordAudit(tx, {
      actor: null,
      action: 'platform.staff.password_set',
      targetType: 'user',
      targetId: userId,
      after: { by: 'server configuration' },
    });
  });
  return true;
}

/**
 * Makes one account WorldRoot staff, creating it first if needed. This is how
 * the first administrator comes to exist: the email and password are read from
 * the server's environment by the caller, never from a request and never from
 * source code.
 *
 * Returns null when the account does not exist and no password was supplied.
 */
export async function ensurePlatformAdmin(db: Db, config: PlatformAdminConfig): Promise<PlatformAdminResult | null> {
  const email = config.email.trim().toLowerCase();
  if (!email) return null;

  let [user] = await db.select().from(users).where(eq(users.email, email));
  let created = false;
  if (!user) {
    if (!config.password) return null;
    await authFor(db).api.signUpEmail({ body: { email, password: config.password, name: email.split('@')[0] ?? email } });
    [user] = await db.select().from(users).where(eq(users.email, email));
    created = true;
  }

  const promoted = user!.platformRole !== 'staff';
  if (promoted) {
    await db.transaction(async (tx) => {
      await tx.update(users).set({ platformRole: 'staff' }).where(eq(users.id, user!.id));
      // Granting staff is the most privileged change there is, so it is always on the record.
      await recordAudit(tx, {
        actor: null,
        action: 'platform.staff.grant',
        targetType: 'user',
        targetId: user!.id,
        after: { platformRole: 'staff', by: 'server configuration' },
      });
    });
  }

  const passwordSet = !created && Boolean(config.syncPassword && config.password) && (await setPassword(db, user!.id, config.password!));
  return { userId: user!.id, created, promoted, passwordSet };
}
