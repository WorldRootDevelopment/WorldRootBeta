/**
 * Achievements: badges a person earns by using WorldRoot. A profile shows the
 * ones that person has earned. The full list, with progress toward the rest,
 * is on the person's own Achievements page. Once earned, an achievement is kept.
 *
 * A few achievements are also badges (see `badges.ts`): those appear in the
 * badge row on a profile as well.
 */

interface AchievementDefinition {
  label: string;
  /** How it is earned, in a sentence. */
  how: string;
  /** How many of the thing counted it takes. */
  target: number;
}

/** In display order: writing, characters, worlds, people, dice. */
export const ACHIEVEMENTS = {
  first_words: { label: 'First words', how: 'Write your first in-character post.', target: 1 },
  storyteller: { label: 'Storyteller', how: 'Write 25 in-character posts.', target: 25 },
  wordsmith: { label: 'Wordsmith', how: 'Write 100 in-character posts.', target: 100 },
  scene_setter: { label: 'Scene setter', how: 'Start 5 scenes.', target: 5 },
  the_end: { label: 'The end', how: 'Bring a scene you started to completion.', target: 1 },
  new_face: { label: 'New face', how: 'Create your first character.', target: 1 },
  ensemble_cast: { label: 'Ensemble cast', how: 'Create 10 characters.', target: 10 },
  world_seed: { label: 'World seed', how: 'Create your first world.', target: 1 },
  worldbuilder: { label: 'Worldbuilder', how: 'Build a world with 5 locations.', target: 5 },
  cartographer: { label: 'Cartographer', how: 'Map 25 locations across your worlds.', target: 25 },
  host: { label: 'Host', how: 'Start a community.', target: 1 },
  regular: { label: 'Regular', how: 'Belong to 3 communities.', target: 3 },
  open_call: { label: 'Open call', how: 'Post a Looking for RP listing.', target: 1 },
  face_to_the_name: { label: 'Face to the name', how: 'Add a profile picture.', target: 1 },
  kindred_spirit: { label: 'Kindred spirit', how: 'Make your first friend.', target: 1 },
  good_company: { label: 'Good company', how: 'Make 5 friends.', target: 5 },
  dice_goblin: { label: 'Dice goblin', how: 'Roll dice 25 times.', target: 25 },
  natural_20: { label: 'Natural 20', how: 'Roll a 20 on a d20.', target: 1 },
  critical_fumble: { label: 'Critical fumble', how: 'Roll a 1 on a d20. It happens to everyone.', target: 1 },
} as const satisfies Record<string, AchievementDefinition>;

export type AchievementKey = keyof typeof ACHIEVEMENTS;

export const ACHIEVEMENT_KEYS = Object.keys(ACHIEVEMENTS) as AchievementKey[];

export const isAchievementKey = (value: unknown): value is AchievementKey => typeof value === 'string' && value in ACHIEVEMENTS;
