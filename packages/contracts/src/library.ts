import { z } from 'zod';

/** An optional text field: trimmed, capped, and stored as null when left empty. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max.toLocaleString('en')} characters.`)
    .nullish()
    .transform((value) => value || null);

const SHORT = 120;
const LINE = 240;
const LONG = 20_000;

/** Only the name is required. A character can be filled in over time. */
export const characterInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(SHORT, `Use at most ${SHORT} characters.`),
  tagline: optionalText(LINE),
  pronouns: optionalText(SHORT),
  age: optionalText(SHORT),
  gender: optionalText(SHORT),
  species: optionalText(SHORT),
  appearance: optionalText(LONG),
  personality: optionalText(LONG),
  biography: optionalText(LONG),
  skills: optionalText(LONG),
  likes: optionalText(LONG),
  dislikes: optionalText(LONG),
  voice: optionalText(LONG),
  boundaries: optionalText(LONG),
});

export type CharacterInput = z.input<typeof characterInputSchema>;

export const worldInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(SHORT, `Use at most ${SHORT} characters.`),
  summary: optionalText(LINE),
  description: optionalText(LONG),
});

export type WorldInput = z.input<typeof worldInputSchema>;

export const locationInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(SHORT, `Use at most ${SHORT} characters.`),
  summary: optionalText(LINE),
  description: optionalText(LONG),
});

export type LocationInput = z.input<typeof locationInputSchema>;
