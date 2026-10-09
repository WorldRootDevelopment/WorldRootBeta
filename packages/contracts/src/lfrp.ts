import { z } from 'zod';
import { CONTENT_RATINGS } from './scenes';

/** What a "Looking for RP" listing can be about. Shown as filters on the board. */
export const LFRP_GENRES = {
  fantasy: 'Fantasy',
  scifi: 'Science Fiction',
  modern: 'Modern Day',
  historical: 'Historical',
  horror: 'Horror',
  mystery: 'Mystery',
  romance: 'Romance',
  adventure: 'Adventure',
  slice_of_life: 'Slice Of Life',
  superhero: 'Superhero',
  fandom: 'Fandom',
  other: 'Something Else',
} as const;

export type LfrpGenre = keyof typeof LFRP_GENRES;
export const LFRP_GENRE_KEYS = Object.keys(LFRP_GENRES) as [LfrpGenre, ...LfrpGenre[]];
export const isLfrpGenre = (value: unknown): value is LfrpGenre => typeof value === 'string' && value in LFRP_GENRES;

export const LFRP_KINDS = { one_on_one: 'One Partner', group: 'A Group' } as const;
export type LfrpKind = keyof typeof LFRP_KINDS;

/** How often the writer expects to post. Mismatched pace ends more roleplay than anything else. */
export const LFRP_PACES = {
  live: 'Live, Back And Forth',
  daily: 'About Once A Day',
  weekly: 'A Few Times A Week',
  relaxed: 'Whenever We Can',
} as const;
export type LfrpPace = keyof typeof LFRP_PACES;

/** A listing lapses after this many days. */
export const LFRP_DAYS = 30;
/** How many listings one person may have open at once. */
export const MAX_OPEN_LFRP = 3;

export const lfrpInputSchema = z.object({
  title: z.string().trim().min(3, 'Give it a title of at least 3 characters.').max(100, 'Use at most 100 characters.'),
  body: z.string().trim().min(20, 'Say a little more: at least 20 characters.').max(2_000, 'Use at most 2,000 characters.'),
  genres: z.array(z.enum(LFRP_GENRE_KEYS), { error: 'Choose at least one genre.' }).min(1, 'Choose at least one genre.').max(3, 'Choose at most three genres.'),
  kind: z.enum(Object.keys(LFRP_KINDS) as [LfrpKind, ...LfrpKind[]], { error: 'Choose one partner or a group.' }),
  pace: z.enum(Object.keys(LFRP_PACES) as [LfrpPace, ...LfrpPace[]], { error: 'Choose a pace.' }),
  rating: z.enum(CONTENT_RATINGS, { error: 'Choose a content rating.' }),
});

export type LfrpInput = z.input<typeof lfrpInputSchema>;
