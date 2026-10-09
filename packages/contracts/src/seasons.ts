/**
 * Site looks: a seasonal or celebratory dressing for the whole of WorldRoot,
 * switched on by staff. Spring and Winter are seasons, not holidays: they
 * carry no festival's symbols, so they suit everyone. A look is a full theme: the logo, the WorldRoot name
 * and page titles, an illustrated banner across the top, the accent color of buttons, the
 * light behind the page, and a few drifting shapes. Text colors, surfaces and
 * each community's own color stay as they are, so contrast never changes.
 *
 * The colors for each look live in the web app's stylesheet, under
 * `[data-season="…"]`.
 */
export const SEASONS = {
  none: { label: 'Standard', note: 'The usual WorldRoot look.' },
  pride: { label: 'Pride', note: 'The six-stripe rainbow flag, waving.' },
  trans: { label: 'Trans Pride', note: 'The light blue, pink and white flag, waving.' },
  halloween: { label: 'Halloween', note: 'Pumpkins, ghosts and a witch under a night sky.' },
  spring: { label: 'Spring', note: 'A meadow in blossom, in soft pastels.' },
  winter: { label: 'Winter', note: 'A snowy valley, in icy blues and white.' },
} as const;

export type SeasonKey = keyof typeof SEASONS;

export const SEASON_KEYS = Object.keys(SEASONS) as SeasonKey[];

export const isSeason = (value: unknown): value is SeasonKey => typeof value === 'string' && value in SEASONS;
