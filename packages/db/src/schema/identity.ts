import { boolean, index, integer, pgEnum, pgTable, text, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { createdAt, id, timestamptz, updatedAt } from './columns';
import { media } from './media';

export const platformRole = pgEnum('platform_role', ['user', 'staff']);

// users, sessions, accounts and verifications follow the Better Auth core schema.
// Property names are the ones the auth library reads and writes; do not rename them.

export const users = pgTable('users', {
  id: id(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  platformRole: platformRole('platform_role').notNull().default('user'),
  // Set while the account is a Premium member. There is no billing yet, so staff set this by hand.
  premiumSince: timestamptz('premium_since'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamptz('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamptz('access_token_expires_at'),
    refreshTokenExpiresAt: timestamptz('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('accounts_user_id_idx').on(t.userId)],
);

export const verifications = pgTable(
  'verifications',
  {
    id: id(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamptz('expires_at').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('verifications_identifier_idx').on(t.identifier)],
);

/** The public face of an account. Created at onboarding, once the user picks a handle. */
export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  handle: text('handle').notNull(),
  // Lower-cased copy carrying the uniqueness constraint, so handles are case-insensitive.
  handleLower: text('handle_lower').notNull().unique(),
  displayName: text('display_name').notNull(),
  pronouns: text('pronouns'),
  bio: text('bio'),
  // Only the confirmation is stored. No date of birth is collected.
  adultConfirmedAt: timestamptz('adult_confirmed_at').notNull(),
  // When this person last had WorldRoot open. Drives the online list in community lounges.
  lastSeenAt: timestamptz('last_seen_at'),
  // When set, this person is never shown as online to anyone else.
  hideOnline: boolean('hide_online').notNull().default(false),
  // When the handle was last changed, for the cooldown between changes.
  // The profile picture, if one has been uploaded.
  avatarMediaId: uuid('avatar_media_id').references((): AnyPgColumn => media.id, { onDelete: 'set null' }),
  // The wide picture across the top of the profile, if one has been uploaded.
  bannerMediaId: uuid('banner_media_id').references((): AnyPgColumn => media.id, { onDelete: 'set null' }),
  // The colour of this person's profile, as a hue. Null takes WorldRoot's own.
  accentHue: integer('accent_hue'),
  // A short line shown under the name: what they are up to, or a favourite quote.
  status: text('status'),
  // How this person's dice look when they roll. A key from the registry in @worldroot/contracts.
  diceTheme: text('dice_theme').notNull().default('classic'),
  handleChangedAt: timestamptz('handle_changed_at'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
