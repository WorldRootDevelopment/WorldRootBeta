import { sql } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, unique, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, timestamptz, updatedAt } from './columns';
import { users } from './identity';

export const communities = pgTable('communities', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  tagline: text('tagline'),
  description: text('description'),
  rules: text('rules'),
  // A community picks a hue, not a color. The accent ramp is generated from it.
  accentHue: integer('accent_hue').notNull().default(155),
  // Listed communities appear in Discover and can be joined without an invite.
  listed: boolean('listed').notNull().default(false),
  requireCharacterApproval: boolean('require_character_approval').notNull().default(false),
  // The highest content rating a scene here may be given: 'everyone', 'teen', 'mature' or 'adult'.
  // The default allows all of them. Lowering it does not change scenes that already exist.
  maxRating: text('max_rating').notNull().default('adult'),
  // Shows the Chronicle: finished scenes read in order, as the chapters of one book. On for the demo
  // communities while it is being tried out; there is no setting for it yet.
  chronicle: boolean('chronicle').notNull().default(false),
  // Turns on dice rolls in this community's scenes.
  dndMode: boolean('dnd_mode').notNull().default(false),
  // Set while the community is archived: kept and readable by its members, but frozen and hidden from everyone else.
  archivedAt: timestamptz('archived_at'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const communityMembers = pgTable(
  'community_members',
  {
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamptz('joined_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.communityId, t.userId] }), index('community_members_user_idx').on(t.userId)],
);

export const roles = pgTable(
  'roles',
  {
    id: id(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    // Higher sits above lower. A member manages only roles below their own highest.
    position: integer('position').notNull().default(0),
    // The built-in Owner role holds every permission and cannot be deleted.
    isOwner: boolean('is_owner').notNull().default(false),
    // The built-in Member role, given to everyone on joining.
    isDefault: boolean('is_default').notNull().default(false),
    // Permission keys from the registry in @worldroot/contracts.
    permissions: text('permissions')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('roles_community_idx').on(t.communityId, t.position)],
);

export const roleAssignments = pgTable(
  'role_assignments',
  {
    id: id(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    // Null applies community-wide. A world id limits the role to that world.
    scopeWorldId: uuid('scope_world_id'),
    createdAt: createdAt(),
  },
  (t) => [
    index('role_assignments_member_idx').on(t.communityId, t.userId),
    unique('role_assignments_unique').on(t.userId, t.roleId, t.scopeWorldId).nullsNotDistinct(),
  ],
);

export const characterFieldType = pgEnum('character_field_type', [
  'short_text',
  'long_text',
  'number',
  'single_choice',
  'multi_choice',
  'link',
]);

/** One field of a community's character template. Values live on the character, keyed by this id. */
export const characterFieldDefinitions = pgTable(
  'character_field_definitions',
  {
    id: id(),
    communityId: uuid('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    type: characterFieldType('type').notNull().default('short_text'),
    required: boolean('required').notNull().default(false),
    // Choices, for the two choice types.
    options: jsonb('options').$type<string[]>(),
    position: integer('position').notNull().default(0),
    createdAt: createdAt(),
    // Removed definitions are kept so existing values are hidden, not lost.
    deletedAt: timestamptz('deleted_at'),
  },
  (t) => [index('character_field_definitions_community_idx').on(t.communityId, t.position)],
);
