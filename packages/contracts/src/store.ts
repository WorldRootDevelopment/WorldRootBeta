import { DICE_THEME_KEYS, DICE_THEMES, type DiceThemeKey } from './dice-themes';

/**
 * The store's catalogue: things a person can own that change how WorldRoot
 * looks for them. Nothing here changes what anyone can do or what a roll
 * comes to.
 *
 * There are no prices yet. Nothing is on sale and nothing takes a payment:
 * how items are paid for, in money or in points, is still to be decided.
 * Until then an item is owned only when WorldRoot staff give it.
 */
export interface StoreItem {
  /** Stored against the people who own it, so it must never change once anyone does. */
  key: string;
  kind: 'dice_theme';
  label: string;
  note: string;
  /** The dice theme this item unlocks. */
  theme: DiceThemeKey;
}

export const diceItemKey = (theme: DiceThemeKey): string => `dice:${theme}`;

/** In display order. Every dice theme that is not free is an item. */
export const STORE_ITEMS: StoreItem[] = DICE_THEME_KEYS.filter((theme) => !DICE_THEMES[theme].free).map((theme) => ({
  key: diceItemKey(theme),
  kind: 'dice_theme',
  label: `${DICE_THEMES[theme].label} Dice`,
  note: DICE_THEMES[theme].note,
  theme,
}));

export const isStoreItem = (value: unknown): value is string => typeof value === 'string' && STORE_ITEMS.some((item) => item.key === value);
