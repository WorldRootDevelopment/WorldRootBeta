/**
 * Site themes: how the whole of WorldRoot looks to one person. A theme changes
 * colors, lettering, corners and the finish of panels and buttons; it never
 * changes what anything does, and nobody else sees it.
 *
 * `default` is WorldRoot's own look and is everyone's. The others come with
 * Heartwood. Each theme's look is written in the web app's stylesheet under
 * the same key, so adding one means adding it in both places.
 */
interface SiteThemeDefinition {
  label: string;
  /** A line for the picker. */
  note: string;
  free: boolean;
}

/** In display order. */
export const SITE_THEMES = {
  default: { label: 'WorldRoot', note: 'Cream, caramel and glass. The look everyone starts with.', free: true },
  book: { label: 'Book And Quill', note: 'Parchment pages, ink and serif lettering, like an old storybook.', free: false },
  aero: { label: 'Frutiger Aero', note: 'Glossy sky blue and green, bubbles and bright light.', free: false },
  win95: { label: 'Windows 95', note: 'Gray panels, hard edges and raised buttons. Always light.', free: false },
  glass: { label: 'Liquid Glass', note: 'Clear, rounded panels that blur a vivid backdrop.', free: false },
} as const satisfies Record<string, SiteThemeDefinition>;

export type SiteThemeKey = keyof typeof SITE_THEMES;

export const SITE_THEME_KEYS = Object.keys(SITE_THEMES) as SiteThemeKey[];

export const DEFAULT_SITE_THEME: SiteThemeKey = 'default';

export const isSiteTheme = (value: unknown): value is SiteThemeKey => typeof value === 'string' && Object.hasOwn(SITE_THEMES, value);

/** The theme to draw with: the stored one if this version knows it, otherwise the default. */
export const toSiteTheme = (value: unknown): SiteThemeKey => (isSiteTheme(value) ? value : DEFAULT_SITE_THEME);
