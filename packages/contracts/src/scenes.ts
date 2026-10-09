import { z } from 'zod';

export const SCENE_STATUSES = ['active', 'on_hold', 'completed', 'archived'] as const;
export type SceneStatus = (typeof SCENE_STATUSES)[number];

export const SCENE_STATUS_LABELS: Record<SceneStatus, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
};

export const CONTENT_RATINGS = ['everyone', 'teen', 'mature', 'adult'] as const;
export type ContentRating = (typeof CONTENT_RATINGS)[number];

export const CONTENT_RATING_LABELS: Record<ContentRating, string> = {
  everyone: 'Everyone',
  teen: 'Teen',
  mature: 'Mature',
  adult: 'Adult',
};

export const CONTENT_RATING_HINTS: Record<ContentRating, string> = {
  everyone: 'Nothing a general audience would mind.',
  teen: 'Mild violence, mild language, romance without detail.',
  mature: 'Strong violence, strong language, dark themes.',
  adult: 'Explicit content.',
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max.toLocaleString('en')} characters.`)
    .nullish()
    .transform((value) => value || null);

export const sceneInputSchema = z.object({
  title: z.string().trim().min(1, 'Give the scene a title.').max(160, 'Use at most 160 characters.'),
  description: optionalText(2_000),
  rating: z.enum(CONTENT_RATINGS, { error: 'Choose a content rating.' }),
  /** A community location. Omitted for a private scene. */
  locationId: z.uuid().nullish(),
  characterIds: z.array(z.uuid()).min(1, 'Choose at least one character.').max(12),
  /** The opening post, as an editor document. Checked against the document schema by the service. */
  openingPost: z.unknown(),
});

export type SceneInput = z.input<typeof sceneInputSchema>;

/** The most pictures one story post can carry. */
export const MAX_POST_IMAGES = 4;

export const postInputSchema = z.object({
  kind: z.enum(['ic', 'ooc']),
  /** The character speaking. Null on an in-character post means narration. Ignored for out-of-character posts. */
  characterId: z.uuid().nullish(),
  content: z.unknown(),
  /** Pictures already uploaded to this scene by the writer, to show under an in-character post. */
  imageIds: z.array(z.uuid()).max(MAX_POST_IMAGES, `Attach at most ${MAX_POST_IMAGES} images.`).optional(),
});

export type PostInput = z.input<typeof postInputSchema>;

/** A post is capped by its plain text length. Long enough for any single post; short enough to keep a scene loadable. */
export const MAX_POST_CHARACTERS = 40_000;
export const MAX_OOC_CHARACTERS = 2_000;
