import { z } from 'zod';

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 24;

export const handleSchema = z
  .string()
  .trim()
  .min(HANDLE_MIN, `Use at least ${HANDLE_MIN} characters.`)
  .max(HANDLE_MAX, `Use at most ${HANDLE_MAX} characters.`)
  .regex(/^[A-Za-z0-9_]+$/, 'Use only letters, numbers and underscores.');

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
});

export type Profile = z.infer<typeof profileSchema>;
