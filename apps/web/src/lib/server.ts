import 'server-only';
import { connect, createAuth, seedDemo, type Auth, type DbConnection } from '@worldroot/core';

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
    if (embedded) {
      await connection.migrate();
      if (process.env.WORLDROOT_DEMO !== 'off') await seedDemo(connection.db);
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
