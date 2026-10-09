import 'server-only';
import { randomBytes } from 'node:crypto';
import {
  connect,
  createAuth,
  DND_DEMO_COMMUNITY_SLUG,
  ensureDemoGuest,
  ensurePlatformAdmin,
  grantDemoAccess,
  lockDemoGuest,
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

const realServer = () => /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? '');

/** Whether the demo communities are loaded here. On a real server they are asked for with WORLDROOT_DEMO=on. */
export const demoEnabled = () => (realServer() ? process.env.WORLDROOT_DEMO === 'on' : process.env.WORLDROOT_DEMO !== 'off');

/**
 * Whether anyone may sign in to the shared guest account. It needs the demo, and on a real server it
 * is asked for separately with WORLDROOT_DEMO_GUEST=on, so that switching it off is one setting.
 */
export const demoGuestEnabled = () => demoEnabled() && (realServer() ? process.env.WORLDROOT_DEMO_GUEST === 'on' : process.env.WORLDROOT_DEMO_GUEST !== 'off');

export function database(): Promise<DbConnection> {
  globals.__worldrootDb ??= (async () => {
    const connection = connect();
    // The embedded database is single-process, so nothing else can prepare it: it loads the demo
    // community here.
    const embedded = !/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? '');
    // The demo communities load by themselves on a developer's machine. On a real server they are
    // asked for with WORLDROOT_DEMO=on, and their account never gets the published password: it gets
    // WORLDROOT_DEMO_PASSWORD, or failing that a random one nobody knows, so it cannot be signed in to.
    const demo = embedded ? process.env.WORLDROOT_DEMO !== 'off' : process.env.WORLDROOT_DEMO === 'on';
    const ownDemoPassword = process.env.WORLDROOT_DEMO_PASSWORD?.trim();
    if (ownDemoPassword && ownDemoPassword.length < 10) console.warn('[worldroot] WORLDROOT_DEMO_PASSWORD is shorter than 10 characters and was ignored.');
    const demoOptions = embedded ? {} : { password: ownDemoPassword && ownDemoPassword.length >= 10 ? ownDemoPassword : randomBytes(32).toString('base64url') };
    // The site brings its own database up to date before it answers anything, on every kind of
    // database. Hosts differ in which start command they run, so this must not depend on someone
    // having run `pnpm db:migrate` first. Applying migrations that are already applied does nothing.
    // If this fails the health check fails, and the host keeps the previous version running.
    // With more than one web server starting at once, run `pnpm db:migrate` as a release step instead.
    await connection.migrate();
    console.log('[worldroot] Database is up to date.');
    if (demo) {
      try {
        await seedDemo(connection.db, demoOptions);
        await seedDndDemo(connection.db, demoOptions);
        if (demoGuestEnabled()) {
          await ensureDemoGuest(connection.db);
          if (!embedded) console.log('[worldroot] The shared guest account is open to anyone.');
        }
        if (!embedded) console.log(`[worldroot] Demo communities are loaded. The demo account ${ownDemoPassword && ownDemoPassword.length >= 10 ? 'uses WORLDROOT_DEMO_PASSWORD' : 'cannot be signed in to'}.`);
      } catch (error) {
        // On a real server a problem with sample content must not take the site down.
        if (embedded) throw error;
        console.error('[worldroot] Could not load the demo communities.', error);
      }
    }

    // Switched off, the guest account must stop working even though it still exists.
    if (!demoGuestEnabled()) {
      try {
        await lockDemoGuest(connection.db);
      } catch (error) {
        console.error('[worldroot] Could not lock the shared guest account.', error);
      }
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
