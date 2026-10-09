/**
 * Dice themes: how a person's dice look when they roll. A theme is only a
 * set of colors; it never changes what is rolled.
 *
 * Every theme here is free and can be chosen by anyone. A theme with
 * `free: false` would be a store item that has to be owned first; there are
 * none at the moment, and the designs meant for the store are still to be made.
 */

interface DiceThemeDefinition {
  label: string;
  /** A line for the picker. */
  note: string;
  free: boolean;
}

/** In display order. `classic` follows the color of the community you are rolling in. */
export const DICE_THEMES = {
  classic: { label: 'Classic', note: 'Takes the color of the community.', free: true },
  ivory: { label: 'Ivory', note: 'Bone white with dark numbers.', free: true },
  obsidian: { label: 'Obsidian', note: 'Black glass with gold numbers.', free: true },
  jade: { label: 'Jade', note: 'Deep green stone.', free: true },
  ember: { label: 'Ember', note: 'Glowing red and orange.', free: true },
  amethyst: { label: 'Amethyst', note: 'Violet crystal.', free: true },
  starlight: { label: 'Starlight', note: 'Midnight blue, flecked with silver.', free: true },
} as const satisfies Record<string, DiceThemeDefinition>;

export type DiceThemeKey = keyof typeof DICE_THEMES;

export const DICE_THEME_KEYS = Object.keys(DICE_THEMES) as DiceThemeKey[];

export const DEFAULT_DICE_THEME: DiceThemeKey = 'classic';

export const isDiceTheme = (value: unknown): value is DiceThemeKey => typeof value === 'string' && value in DICE_THEMES;

/** The theme to draw with: the stored one if this version knows it, otherwise the default. */
export const toDiceTheme = (value: unknown): DiceThemeKey => (isDiceTheme(value) ? value : DEFAULT_DICE_THEME);
