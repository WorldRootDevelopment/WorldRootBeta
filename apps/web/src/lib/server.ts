import 'server-only';
import { connect, createAuth, ensurePlatformAdmin, grantDemoAccess, seedDemo, type Auth, type DbConnection } from '@worldroot/core';

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
    // The embedded database is single-process, so nothing else can prepare it: it migrates itself
    // and loads the demo community here. A real server is migrated with `pnpm db:migrate`.
    const embedded = !/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? '');
    const demo = embedded && process.env.WORLDROOT_DEMO !== 'off';
    if (embedded) await connection.migrate();
    if (demo) await seedDemo(connection.db);

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
          if (demo) await grantDemoAccess(connection.db, admin.userId);
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
      ...oauthProviders,
    });
  })();
  return globals.__worldrootAuth;
}
