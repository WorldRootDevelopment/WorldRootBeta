import { z } from 'zod';
import { PERMISSION_KEYS, type PermissionKey } from './permissions';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max.toLocaleString('en')} characters.`)
    .nullish()
    .transform((value) => value || null);

export const communitySlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Use at least 3 characters.')
  .max(40, 'Use at most 40 characters.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens.');

/** The editable details of a community. */
export const communitySettingsSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(80, 'Use at most 80 characters.'),
  tagline: optionalText(160),
  description: optionalText(10_000),
  rules: optionalText(10_000),
  // A hue on the colour wheel. The accent ramp is generated from it, so any value stays readable.
  accentHue: z.coerce.number({ error: 'Choose a colour.' }).int().min(0).max(359),
  listed: z.boolean(),
  requireCharacterApproval: z.boolean(),
});

export type CommunitySettingsInput = z.input<typeof communitySettingsSchema>;

export const createCommunitySchema = communitySettingsSchema
  .pick({ name: true, tagline: true, description: true, accentHue: true, listed: true })
  .extend({ slug: communitySlugSchema });

export type CreateCommunityFormInput = z.input<typeof createCommunitySchema>;

export const roleInputSchema = z.object({
  name: z.string().trim().min(1, 'Name the role.').max(40, 'Use at most 40 characters.'),
  permissions: z.array(z.enum(PERMISSION_KEYS as [PermissionKey, ...PermissionKey[]])),
});

export type RoleInput = z.input<typeof roleInputSchema>;

export const CHARACTER_FIELD_TYPES = ['short_text', 'long_text', 'number', 'single_choice'] as const;

export const CHARACTER_FIELD_TYPE_LABELS: Record<(typeof CHARACTER_FIELD_TYPES)[number], string> = {
  short_text: 'Short text',
  long_text: 'Long text',
  number: 'Number',
  single_choice: 'Choice from a list',
};

export const characterFieldInputSchema = z
  .object({
    label: z.string().trim().min(1, 'Name the field.').max(60, 'Use at most 60 characters.'),
    type: z.enum(CHARACTER_FIELD_TYPES),
    required: z.boolean(),
    /** Choices, one per entry. Used by the choice type only. */
    options: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  })
  .refine((field) => field.type !== 'single_choice' || (field.options?.length ?? 0) >= 2, {
    path: ['options'],
    message: 'Give at least two choices, one per line.',
  });

export type CharacterFieldInput = z.input<typeof characterFieldInputSchema>;
