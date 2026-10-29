import { z } from 'zod';

/** The most chat channels one community may have. */
export const MAX_CHANNELS = 50;

/**
 * A channel's name is also its address, so it is kept to lower-case letters,
 * numbers and hyphens, as on other chat services.
 */
export const channelNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => value.replace(/\s+/g, '-'))
  .pipe(
    z
      .string()
      .min(1, 'Give the channel a name.')
      .max(32, 'Use at most 32 characters.')
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lower-case letters, numbers and hyphens.'),
  );

const optionalLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max.toLocaleString('en')} characters.`)
    .nullish()
    .transform((value) => value || null);

/** A list of role ids, or null for "no restriction". An empty list means the same as null. */
const roleList = z
  .array(z.uuid())
  .max(50)
  .nullish()
  .transform((value) => (value && value.length > 0 ? [...new Set(value)] : null));

/** What can be set on a chat channel. */
export const channelInputSchema = z.object({
  name: channelNameSchema,
  /** A line under the channel's name saying what it is for. */
  topic: optionalLine(200),
  /** The heading the channel is listed under. Channels with the same heading are grouped. */
  category: optionalLine(40),
  /** Only people holding one of these roles can see the channel. Null: everyone who can see the community. */
  readRoleIds: roleList,
  /** Only people holding one of these roles can post. Null: everyone allowed to post in channels. */
  postRoleIds: roleList,
});

export type ChannelInput = z.input<typeof channelInputSchema>;

/** The reactions offered first, one press away. Any other emoji can be added too. */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👀'] as const;

/** A reaction: exactly one emoji, as the device's own emoji keyboard types it. */
export type Reaction = string;

// One emoji from the Unicode list, counting skin tones, flags and joined emoji such as families as one.
// Built at run time because the `v` flag it needs is newer than the language level the code is checked against.
// A browser too old for it falls back to a looser check; the server, which has the final say, always has it.
const ONE_EMOJI = (() => {
  try {
    return new RegExp('^\\p{RGI_Emoji}$', 'v');
  } catch {
    return /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2})(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Emoji_Component}|‍|️)*$/u;
  }
})();

/** Whether a value is one emoji and nothing else: no letters, no spaces, no two emoji together. */
export const isReaction = (value: unknown): value is Reaction => typeof value === 'string' && value.length <= 32 && ONE_EMOJI.test(value);

/** The most different emoji one message can carry, so a message cannot be buried under them. */
export const MAX_REACTION_KINDS = 20;

/** The most people one message can mention and notify. More are still linked, just not told. */
export const MAX_MENTIONS = 10;

/** The @handles in a message, without repeats, in the order written. */
export function mentionedHandles(body: string): string[] {
  const found = [...body.matchAll(/(^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{3,24})(?![A-Za-z0-9_])/g)].map((match) => match[2]!.toLowerCase());
  return [...new Set(found)];
}
