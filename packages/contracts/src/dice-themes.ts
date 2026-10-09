/**
 * Dice themes: how a person's dice look when they roll. A theme is only a
 * set of colours; it never changes what is rolled.
 *
 * `free` themes can be chosen by anyone. The others are shown as previews
 * and cannot be chosen yet: they are the ones meant to be earned with points
 * or bought, once WorldRoot has a way to do either. Nothing here takes a
 * payment or tracks ownership; that is still to be designed.
 */

interface DiceThemeDefinition {
  label: string;
  /** A line for the picker. */
  note: string;
  free: boolean;
}

/** In display order. `classic` follows the colour of the community you are rolling in. */
export const DICE_THEMES = {
  classic: { label: 'Classic', note: 'Takes the colour of the community.', free: true },
  ivory: { label: 'Ivory', note: 'Bone white with dark numbers.', free: true },
  obsidian: { label: 'Obsidian', note: 'Black glass with gold numbers.', free: true },
  jade: { label: 'Jade', note: 'Deep green stone.', free: false },
  ember: { label: 'Ember', note: 'Glowing red and orange.', free: false },
  amethyst: { label: 'Amethyst', note: 'Violet crystal.', free: false },
  starlight: { label: 'Starlight', note: 'Midnight blue, flecked with silver.', free: false },
} as const satisfies Record<string, DiceThemeDefinition>;

export type DiceThemeKey = keyof typeof DICE_THEMES;

export const DICE_THEME_KEYS = Object.keys(DICE_THEMES) as DiceThemeKey[];

export const DEFAULT_DICE_THEME: DiceThemeKey = 'classic';

export const isDiceTheme = (value: unknown): value is DiceThemeKey => typeof value === 'string' && value in DICE_THEMES;

/** The theme to draw with: the stored one if this version knows it, otherwise the default. */
export const toDiceTheme = (value: unknown): DiceThemeKey => (isDiceTheme(value) ? value : DEFAULT_DICE_THEME);
