import { z } from 'zod';
import { BADGE_KEYS, type BadgeKey } from './badges';

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 24;

export const handleSchema = z
  .string()
  .trim()
  .min(HANDLE_MIN, `Use at least ${HANDLE_MIN} characters.`)
  .max(HANDLE_MAX, `Use at most ${HANDLE_MAX} characters.`)
  .regex(/^[A-Za-z0-9_]+$/, 'Use only letters, numbers and underscores.');

/** A color as the browser's color picker gives it: #rrggbb. Checked strictly, because it is placed in a page's styles. */
const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Choose a color.').transform((value) => value.toLowerCase());

/** A person's own two-color background for their profile. */
export const profileThemeSchema = z.object({
  from: hexColor,
  to: hexColor,
  /** The direction the colors run in, in degrees. */
  angle: z.coerce.number().int().min(0, 'Choose a direction.').max(360, 'Choose a direction.'),
});

export type ProfileTheme = z.infer<typeof profileThemeSchema>;

export const createProfileSchema = z.object({
  handle: handleSchema,
  displayName: z.string().trim().min(1, 'Enter a display name.').max(50, 'Use at most 50 characters.'),
  // WorldRoot is 18+. Only the confirmation is recorded, never a date of birth.
  adultConfirmed: z.literal(true, { error: 'You must confirm that you are 18 or older.' }),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;

export const profileSchema = z.object({
  userId: z.string(),
  handle: z.string(),
  displayName: z.string(),
  pronouns: z.string().nullable(),
  bio: z.string().nullable(),
  /** The id of their profile picture, served from /api/v1/media. */
  avatarId: z.string().nullable(),
  /** The id of the wide picture across the top of their profile. */
  bannerId: z.string().nullable(),
  /** The color of their profile, as a hue from 0 to 359. Null takes WorldRoot's own. */
  accentHue: z.number().nullable(),
  /** Their own two-color background. Null takes the plain look. */
  theme: profileThemeSchema.nullable(),
  /** A short line shown under their name. */
  status: z.string().nullable(),
  /** How their dice look when they roll. A key from the dice theme registry. */
  diceTheme: z.string(),
  /** WorldRoot staff. Kept beside `badges` because code asks this question directly. */
  isStaff: z.boolean(),
  /** Platform badges shown beside their name everywhere, most significant first. */
  badges: z.array(z.enum(BADGE_KEYS as [BadgeKey, ...BadgeKey[]])),
});

export type Profile = z.infer<typeof profileSchema>;

const optionalLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max.toLocaleString('en')} characters.`)
    .nullish()
    .transform((value) => value || null);

/** What a person may change about their own profile. The handle is fixed for now. */
export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter a display name.').max(50, 'Use at most 50 characters.'),
  pronouns: optionalLine(40),
  bio: optionalLine(2_000),
  hideOnline: z.boolean(),
  // Left out, these stay as they are.
  status: optionalLine(80).optional(),
  accentHue: z.coerce.number().int().min(0).max(359).nullable().optional(),
  theme: profileThemeSchema.nullable().optional(),
});

export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
