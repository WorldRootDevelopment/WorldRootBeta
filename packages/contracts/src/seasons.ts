/**
 * Site looks: a seasonal or celebratory dressing for the whole of WorldRoot,
 * switched on by staff. A look changes the logo, the WorldRoot name and a
 * stripe across the top of every page. It changes nothing else: text colors,
 * community colors and contrast stay as they are.
 *
 * The colors for each look live in the web app's stylesheet, under
 * `[data-season="…"]`.
 */
export const SEASONS = {
  none: { label: 'Standard', note: 'The usual WorldRoot look.' },
  pride: { label: 'Pride', note: 'The six-stripe rainbow flag.' },
  trans: { label: 'Trans Pride', note: 'Light blue, pink and white.' },
  halloween: { label: 'Halloween', note: 'Orange, purple and black.' },
  easter: { label: 'Easter', note: 'Soft spring pastels.' },
  holidays: { label: 'Holidays', note: 'Red, green, white and gold.' },
} as const;

export type SeasonKey = keyof typeof SEASONS;

export const SEASON_KEYS = Object.keys(SEASONS) as SeasonKey[];

export const isSeason = (value: unknown): value is SeasonKey => typeof value === 'string' && value in SEASONS;
