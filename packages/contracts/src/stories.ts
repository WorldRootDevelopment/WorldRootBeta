import { z } from 'zod';
import { CONTENT_RATINGS } from './scenes';

/** Who can read a story. */
export const STORY_VISIBILITIES = ['private', 'unlisted', 'public'] as const;
export type StoryVisibility = (typeof STORY_VISIBILITIES)[number];

export const STORY_VISIBILITY_LABELS: Record<StoryVisibility, { label: string; hint: string }> = {
  private: { label: 'Private', hint: 'Only you can read it.' },
  unlisted: { label: 'Link Only', hint: 'Anyone signed in to WorldRoot who has the link can read it. It is not listed anywhere.' },
  public: { label: 'Public', hint: 'Listed on your profile and on the pages of the characters in it.' },
};

/** A chapter is capped by its plain text length: long enough for any chapter, short enough to load quickly. */
export const MAX_CHAPTER_CHARACTERS = 200_000;
export const MAX_CHAPTERS = 200;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max.toLocaleString('en')} characters.`)
    .nullish()
    .transform((value) => value || null);

export const storyInputSchema = z.object({
  title: z.string().trim().min(1, 'Give the story a title.').max(160, 'Use at most 160 characters.'),
  summary: optionalText(2_000),
  rating: z.enum(CONTENT_RATINGS, { error: 'Choose a content rating.' }),
  visibility: z.enum(STORY_VISIBILITIES, { error: 'Choose who can read it.' }),
  /** One of the writer's library worlds, or null. */
  worldId: z.uuid().nullish().transform((value) => value ?? null),
  /** The writer's own library characters who appear in it. */
  characterIds: z.array(z.uuid()).max(50, 'Tag at most 50 characters.').default([]),
});

export type StoryInput = z.input<typeof storyInputSchema>;

export const chapterTitleSchema = optionalText(160);
