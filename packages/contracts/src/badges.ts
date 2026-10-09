/**
 * The badge registry. A badge is a small label beside a person's name.
 *
 * Platform badges belong to the account and are shown everywhere. Community
 * badges describe a person's standing in one community and are shown only
 * inside it. The two are drawn differently, so WorldRoot staff are never
 * mistaken for a community's own admins, or the other way round.
 */

interface BadgeDefinition {
  label: string;
  /** Shown on hover and read by screen readers. */
  title: string;
  /** How someone comes to have it, for the list of all badges. */
  how: string;
  /** Which fixed color the badge takes. Never the community's accent. */
  tone: 'staff' | 'premium' | 'special';
  /** Staff may hand this out by hand. Staff and Premium are derived from the account, and earned badges are earned. */
  grantable: boolean;
}

/** In display order: the most significant badge comes first. */
export const BADGES = {
  staff: { label: 'Staff', title: 'WorldRoot staff', how: 'Held by the people who work on WorldRoot.', tone: 'staff', grantable: false },
  founder: { label: 'Founder', title: 'Founded WorldRoot', how: 'For the people who started WorldRoot.', tone: 'special', grantable: true },
  premium: { label: 'Premium', title: 'WorldRoot Premium member', how: 'Comes with WorldRoot Premium, which is not on sale yet.', tone: 'premium', grantable: false },
  early_supporter: { label: 'Early supporter', title: 'Supported WorldRoot from the start', how: 'Given by WorldRoot to people who backed it early.', tone: 'special', grantable: true },
  beta_tester: { label: 'Beta tester', title: 'Helped test WorldRoot before launch', how: 'Given by WorldRoot to people who tested it before launch.', tone: 'special', grantable: true },
  // Earned, not granted. These two are achievements that also sit in the badge row; the keys match the achievement registry.
  worldbuilder: { label: 'Worldbuilder', title: 'Built a world with 5 locations', how: 'Earned with the Worldbuilder achievement: build a world with 5 locations.', tone: 'special', grantable: false },
  cartographer: { label: 'Cartographer', title: 'Mapped 25 locations across their worlds', how: 'Earned with the Cartographer achievement: map 25 locations across your worlds.', tone: 'special', grantable: false },
} as const satisfies Record<string, BadgeDefinition>;

export type BadgeKey = keyof typeof BADGES;

export const BADGE_KEYS = Object.keys(BADGES) as BadgeKey[];

export const GRANTABLE_BADGES = BADGE_KEYS.filter((key) => BADGES[key].grantable);

export const isBadgeKey = (value: unknown): value is BadgeKey => typeof value === 'string' && value in BADGES;

/** Keeps the badges this version knows, in registry order. */
export const toBadges = (values: readonly unknown[] | null | undefined): BadgeKey[] =>
  BADGE_KEYS.filter((key) => (values ?? []).includes(key));

/** A person's standing in one community. At most one is shown: the highest they hold. */
export const COMMUNITY_BADGES = {
  owner: { label: 'Owner', title: 'Owns this community' },
  admin: { label: 'Admin', title: 'Runs this community' },
  moderator: { label: 'Mod', title: 'Moderates this community' },
} as const;

export type CommunityBadgeKey = keyof typeof COMMUNITY_BADGES;
