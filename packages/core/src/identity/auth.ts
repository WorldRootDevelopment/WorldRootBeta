import { accounts, newId, sessions, users, verifications, type Db } from '@worldroot/db';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

export interface AuthConfig {
  db: Db;
  secret: string;
  baseURL: string;
  /** A provider is enabled only when its credentials are supplied. */
  discord?: OAuthCredentials;
  google?: OAuthCredentials;
  /** Framework plugins, such as the Next.js cookie plugin, supplied by the app. */
  plugins?: BetterAuthOptions['plugins'];
}

/** Builds the auth instance. Sessions are database rows, so they can be listed and revoked. */
export function createAuth(config: AuthConfig) {
  return betterAuth({
    secret: config.secret,
    baseURL: config.baseURL,
    database: drizzleAdapter(config.db, {
      provider: 'pg',
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
    },
    socialProviders: {
      ...(config.discord ? { discord: config.discord } : {}),
      ...(config.google ? { google: config.google } : {}),
    },
    account: {
      accountLinking: {
        enabled: true,
        // Signing in with Discord or Google never quietly joins itself to an existing account that happens to
        // have the same email. WorldRoot does not verify email addresses, so anyone could have made that
        // account. A provider is connected only from Settings, by someone already signed in.
        disableImplicitLinking: true,
        // The person connecting is already signed in, so their Discord email need not match.
        allowDifferentEmails: true,
      },
    },
    user: {
      additionalFields: {
        platformRole: { type: 'string', required: false, defaultValue: 'user', input: false },
      },
    },
    advanced: {
      database: { generateId: () => newId() },
    },
    plugins: config.plugins ?? [],
  });
}

export type Auth = ReturnType<typeof createAuth>;
