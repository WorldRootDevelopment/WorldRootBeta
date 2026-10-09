import 'server-only';
import {
  connect,
  createAuth,
  DND_DEMO_COMMUNITY_SLUG,
  ensurePlatformAdmin,
  grantDemoAccess,
  seedDemo,
  seedDndDemo,
  type Auth,
  type DbConnection,
} from '@worldroot/core';

// Held on globalThis so development hot reloads reuse one connection.
const globals = globalThis as { __worldrootDb?: Promise<DbConnection>; __worldrootAuth?: Promise<Auth> };

const oauth = (id: string | undefined, secret: string | undefined) =>
  id && secret ? { clientId: id, clientSecret: secret } : undefined;

export const oauthProviders = {
  discord: oauth(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_CLIENT_SECRET),
  google: oauth(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET),
};

export function database(): Promise<DbConnection> {
  globals.__worldrootDb ??= (async () => {
    const connection = connect();
    // The embedded database is single-process, so nothing else can prepare it: it loads the demo
    // community here.
    const embedded = !/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? '');
    const demo = embedded && process.env.WORLDROOT_DEMO !== 'off';
    // The site brings its own database up to date before it answers anything, on every kind of
    // database. Hosts differ in which start command they run, so this must not depend on someone
    // having run `pnpm db:migrate` first. Applying migrations that are already applied does nothing.
    // If this fails the health check fails, and the host keeps the previous version running.
    // With more than one web server starting at once, run `pnpm db:migrate` as a release step instead.
    await connection.migrate();
    console.log('[worldroot] Database is up to date.');
    if (demo) {
      await seedDemo(connection.db);
      await seedDndDemo(connection.db);
    }

    // The platform administrator is named in the server's own settings, never in code and never by a request.
    const adminEmail = process.env.WORLDROOT_ADMIN_EMAIL;
    if (adminEmail) {
      try {
        const admin = await ensurePlatformAdmin(connection.db, {
          email: adminEmail,
          password: process.env.WORLDROOT_ADMIN_PASSWORD,
          // Replacing an existing account's password from a settings file is for a developer's own machine only.
          syncPassword: embedded && process.env.WORLDROOT_ADMIN_PASSWORD_SYNC === 'true',
        });
        if (!admin) {
          console.warn('[worldroot] WORLDROOT_ADMIN_EMAIL has no account yet. Sign up with it, or set WORLDROOT_ADMIN_PASSWORD to have it created.');
        } else {
          const done = [admin.created && 'account created', admin.promoted && 'made an administrator', admin.passwordSet && 'password set from settings'].filter(Boolean);
          console.log(`[worldroot] Administrator ${adminEmail}: ${done.length > 0 ? done.join(', ') : 'already set up'}.`);
          if (demo) {
            await grantDemoAccess(connection.db, admin.userId);
            await grantDemoAccess(connection.db, admin.userId, DND_DEMO_COMMUNITY_SLUG);
          }
        }
      } catch (error) {
        // A problem here must not stop the site from starting.
        console.error('[worldroot] Could not set up the platform administrator.', error);
      }
    }
    return connection;
  })();
  return globals.__worldrootDb;
}

export function getAuth(): Promise<Auth> {
  globals.__worldrootAuth ??= (async () => {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') throw new Error('BETTER_AUTH_SECRET is required in production');
    const { db } = await database();
    return createAuth({
      db,
      secret: secret ?? 'dev-only-secret-change-me',
      baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
      clientIpHeaders: (process.env.WORLDROOT_CLIENT_IP_HEADER ?? '')
        .split(',')
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean),
      ...oauthProviders,
    });
  })();
  return globals.__worldrootAuth;
}
