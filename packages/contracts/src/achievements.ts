/**
 * Achievements: badges a person earns by using WorldRoot. They are shown on a
 * profile, in a collection of their own, and never beside a name. That keeps
 * the badges beside a name few and meaningful (Staff, Premium and the like),
 * and keeps these for fun. Once earned, an achievement is kept.
 */

interface AchievementDefinition {
  label: string;
  /** How it is earned, in a sentence. */
  how: string;
}

/** In display order. */
export const ACHIEVEMENTS = {
  first_words: { label: 'First words', how: 'Wrote a first in-character post.' },
  wordsmith: { label: 'Wordsmith', how: 'Wrote 100 in-character posts.' },
  ensemble_cast: { label: 'Ensemble cast', how: 'Created 10 characters.' },
  worldbuilder: { label: 'Worldbuilder', how: 'Built a world with at least 5 locations.' },
  cartographer: { label: 'Cartographer', how: 'Mapped 25 locations across their worlds.' },
  host: { label: 'Host', how: 'Started a community.' },
  good_company: { label: 'Good company', how: 'Made 5 friends.' },
  dice_goblin: { label: 'Dice goblin', how: 'Rolled dice 25 times.' },
  natural_20: { label: 'Natural 20', how: 'Rolled a 20 on a d20.' },
  critical_fumble: { label: 'Critical fumble', how: 'Rolled a 1 on a d20. It happens to everyone.' },
} as const satisfies Record<string, AchievementDefinition>;

export type AchievementKey = keyof typeof ACHIEVEMENTS;

export const ACHIEVEMENT_KEYS = Object.keys(ACHIEVEMENTS) as AchievementKey[];

export const isAchievementKey = (value: unknown): value is AchievementKey => typeof value === 'string' && value in ACHIEVEMENTS;
