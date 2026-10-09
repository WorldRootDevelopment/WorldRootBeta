import { z } from 'zod';

/**
 * WorldRoot's paid membership, called Heartwood after the strong wood at the
 * centre of a tree. In code it is still `premium`, the name it was built
 * under; only what people read was renamed.
 *
 * WorldRoot Heartwood: what it is called, what it costs, and what a free
 * account is limited to. Nothing here takes a payment. Until billing exists,
 * an account is Heartwood only when WorldRoot staff make it so.
 */
export const PREMIUM = {
  name: 'WorldRoot Heartwood',
  /** In US dollars, a month. Shown on the store page; not charged by anything yet. */
  monthlyPrice: 5,
} as const;

/**
 * What a free account may have. Heartwood and staff accounts have no limit.
 * Reaching a limit only stops new ones being made: nothing a person already
 * has is ever taken away, including when Heartwood ends.
 */
export const FREE_LIMITS = {
  /** Characters in a person's own library. Copies of them in communities do not count. */
  characters: 10,
  /** Communities a person owns that are not archived. Meant for the beta, and to be lifted after it. */
  communities: 3,
  /** Pictures in one character's gallery, not counting its portrait. */
  characterImages: 1,
} as const;

/** What Heartwood raises a limit to, where it does not remove it altogether. */
export const PREMIUM_LIMITS = {
  characterImages: 10,
} as const;

/**
 * Places a Heartwood member can point to from their profile. These are the
 * creative corners of the internet that writers and artists actually use, not
 * the large general social networks.
 *
 * A link is built here from a handle, never stored as a free address, so a
 * profile can only ever point at the service it names. Nothing checks that
 * the handle belongs to the person: a link is a claim, not a verification.
 */
interface LinkService {
  label: string;
  /** What to type, shown beside the box. */
  hint: string;
  /** What a handle on this service looks like. */
  pattern: RegExp;
  /** The address for a handle, or null where there is nothing to link to. */
  url: ((handle: string) => string) | null;
}

export const LINK_SERVICES = {
  bluesky: { label: 'Bluesky', hint: 'yourname.bsky.social', pattern: /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i, url: (h) => `https://bsky.app/profile/${h}` },
  mastodon: {
    label: 'Mastodon',
    hint: 'yourname@instance.social',
    pattern: /^[a-z0-9_]{1,30}@[a-z0-9-]+(\.[a-z0-9-]+)+$/i,
    url: (h) => `https://${h.split('@')[1]}/@${h.split('@')[0]}`,
  },
  tumblr: { label: 'Tumblr', hint: 'yourname', pattern: /^[a-z0-9-]{1,32}$/i, url: (h) => `https://${h}.tumblr.com` },
  furaffinity: { label: 'Fur Affinity', hint: 'yourname', pattern: /^[a-z0-9_.~-]{1,30}$/i, url: (h) => `https://www.furaffinity.net/user/${h}/` },
  deviantart: { label: 'DeviantArt', hint: 'yourname', pattern: /^[a-z0-9-]{3,20}$/i, url: (h) => `https://www.deviantart.com/${h}` },
  itaku: { label: 'Itaku', hint: 'yourname', pattern: /^[a-z0-9_]{1,30}$/i, url: (h) => `https://itaku.ee/profile/${h}` },
  toyhouse: { label: 'Toyhouse', hint: 'yourname', pattern: /^[a-z0-9_-]{1,30}$/i, url: (h) => `https://toyhou.se/${h}` },
  ao3: { label: 'Archive Of Our Own', hint: 'yourname', pattern: /^[a-z0-9_]{3,40}$/i, url: (h) => `https://archiveofourown.org/users/${h}` },
  worldanvil: { label: 'World Anvil', hint: 'yourname', pattern: /^[a-z0-9_-]{1,40}$/i, url: (h) => `https://www.worldanvil.com/author/${h}` },
  itch: { label: 'itch.io', hint: 'yourname', pattern: /^[a-z0-9_-]{1,40}$/i, url: (h) => `https://${h}.itch.io` },
  kofi: { label: 'Ko-fi', hint: 'yourname', pattern: /^[a-z0-9_]{1,40}$/i, url: (h) => `https://ko-fi.com/${h}` },
  carrd: { label: 'Carrd', hint: 'yourname', pattern: /^[a-z0-9-]{1,40}$/i, url: (h) => `https://${h}.carrd.co` },
  twitch: { label: 'Twitch', hint: 'yourname', pattern: /^[a-z0-9_]{4,25}$/i, url: (h) => `https://www.twitch.tv/${h}` },
  // Discord has no public profile pages, so this one is shown as a name to look up, not a link.
  discord: { label: 'Discord', hint: 'yourname', pattern: /^[a-z0-9_.]{2,32}$/i, url: null },
} as const satisfies Record<string, LinkService>;

export type LinkServiceKey = keyof typeof LINK_SERVICES;

export const LINK_SERVICE_KEYS = Object.keys(LINK_SERVICES) as LinkServiceKey[];

/** The most links one profile shows. */
export const MAX_PROFILE_LINKS = 8;

const profileLinkSchema = z
  .object({
    service: z.enum(LINK_SERVICE_KEYS as [LinkServiceKey, ...LinkServiceKey[]], { error: 'Choose where this link goes.' }),
    // A leading @ is how people write handles; it is not part of one.
    handle: z.string().trim().transform((value) => value.replace(/^@/, '')),
  })
  .refine((link) => LINK_SERVICES[link.service].pattern.test(link.handle), { error: 'That does not look like a name on that site. Enter the name only, not a full address.' });

export const profileLinksSchema = z
  .array(profileLinkSchema)
  .max(MAX_PROFILE_LINKS, `Add at most ${MAX_PROFILE_LINKS} links.`)
  .refine((links) => new Set(links.map((link) => link.service)).size === links.length, { error: 'Add each site only once.' });

export type ProfileLinkInput = z.input<typeof profileLinkSchema>;

/** A link as a profile shows it. */
export interface ProfileLink {
  service: LinkServiceKey;
  label: string;
  handle: string;
  /** Null where the service has no page to open. */
  url: string | null;
}

/** Turns stored links into what a profile shows, dropping any this version no longer knows or accepts. */
export function toProfileLinks(stored: unknown): ProfileLink[] {
  if (!Array.isArray(stored)) return [];
  const parsed = profileLinksSchema.safeParse(stored);
  if (!parsed.success) return [];
  return parsed.data.map(({ service, handle }) => ({ service, label: LINK_SERVICES[service].label, handle, url: LINK_SERVICES[service].url?.(handle) ?? null }));
}

/**
 * A person's own website. Any https address is allowed, which makes it the one
 * link on a profile that can point anywhere, so it is shown with its host name
 * and opened without passing anything of WorldRoot's along.
 */
export const websiteSchema = z
  .string()
  .trim()
  .max(200, 'Use at most 200 characters.')
  .nullish()
  .transform((value) => value || null)
  .refine((value) => {
    if (value === null) return true;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname.includes('.') && !url.username && !url.password;
    } catch {
      return false;
    }
  }, 'Enter a full address starting with https://');
