/**
 * The badge registry. A badge is a small label beside a person's name.
 *
 * WorldRoot is named for the World Tree, and its badges follow: the people
 * who look after WorldRoot are Rootwardens, after those who tend the tree's
 * roots; the ones who planted it are Seedbearers; and so on. Each badge's
 * `title` still says plainly what it means, because a name alone should never
 * leave someone unsure who they are talking to.
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
  /** Staff may hand this out by hand. Staff and Heartwood are derived from the account, and earned badges are earned. */
  grantable: boolean;
}

/** In display order: the most significant badge comes first. */
export const BADGES = {
  staff: { label: 'Rootwarden', title: 'Rootwarden: WorldRoot Staff', how: 'Held by the Rootwardens, the staff who look after WorldRoot.', tone: 'staff', grantable: false },
  founder: { label: 'Seedbearer', title: 'Seedbearer: Planted WorldRoot', how: 'For the people who planted WorldRoot.', tone: 'special', grantable: true },
  premium: { label: 'Heartwood', title: 'WorldRoot Heartwood Member', how: 'Comes with WorldRoot Heartwood, which is not on sale yet.', tone: 'premium', grantable: false },
  early_supporter: { label: 'Deeproot', title: 'Deeproot: Supported WorldRoot From The Start', how: 'Given by WorldRoot to people who backed it early.', tone: 'special', grantable: true },
  beta_tester: { label: 'Seedling', title: 'Seedling: Helped Test WorldRoot Before Launch', how: 'Given by WorldRoot to people who tested it before launch.', tone: 'special', grantable: true },
  // Earned, not granted. These two are achievements that also sit in the badge row; the keys match the achievement registry.
  worldbuilder: { label: 'Worldbuilder', title: 'Worldbuilder: Built A World With 5 Locations', how: 'Earned with the Worldbuilder achievement: build a world with 5 locations.', tone: 'special', grantable: false },
  cartographer: { label: 'Cartographer', title: 'Cartographer: Mapped 25 Locations Across Their Worlds', how: 'Earned with the Cartographer achievement: map 25 locations across your worlds.', tone: 'special', grantable: false },
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
  owner: { label: 'Owner', title: 'Owns This Community' },
  admin: { label: 'Admin', title: 'Runs This Community' },
  moderator: { label: 'Mod', title: 'Moderates This Community' },
} as const;

export type CommunityBadgeKey = keyof typeof COMMUNITY_BADGES;
