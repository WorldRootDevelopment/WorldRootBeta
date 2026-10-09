/**
 * Site looks: a seasonal or celebratory dressing for the whole of WorldRoot.
 * Spring and Winter are seasons, not holidays: they carry no festival's
 * symbols, so they suit everyone. A look is a full theme: the logo, the
 * WorldRoot name and page titles, an illustrated banner across the top, the
 * accent color of buttons, the light behind the page, and a few drifting
 * shapes. Text colors, surfaces and each community's own color stay as they
 * are, so contrast never changes.
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

/**
 * What staff have chosen: one look held on until they change it, or
 * `auto`, which follows the calendar below. `auto` is the default.
 */
export type SeasonMode = SeasonKey | 'auto';

export const isSeasonMode = (value: unknown): value is SeasonMode => value === 'auto' || isSeason(value);

interface CalendarEntry {
  season: SeasonKey;
  /** First and last day, each as [month, day], inclusive. A range may run over the new year. */
  from: [number, number];
  to: [number, number];
  /** Shown to staff beside the dates. */
  why: string;
}

/**
 * When each look comes on by itself. Earlier entries win, so a single day of
 * observance can sit inside a season. The seasons are the northern
 * hemisphere's; dates are read in UTC.
 */
export const SEASON_CALENDAR: CalendarEntry[] = [
  { season: 'trans', from: [3, 31], to: [3, 31], why: 'Trans Day of Visibility' },
  { season: 'trans', from: [11, 13], to: [11, 20], why: 'Trans Awareness Week and Trans Day of Remembrance' },
  { season: 'pride', from: [6, 1], to: [6, 30], why: 'Pride Month' },
  { season: 'halloween', from: [10, 1], to: [10, 31], why: 'The month of Halloween' },
  { season: 'winter', from: [12, 1], to: [2, 29], why: 'Winter' },
  { season: 'spring', from: [3, 1], to: [5, 31], why: 'Spring' },
];

const ordinal = ([month, day]: [number, number]) => month * 100 + day;

/** The look the calendar calls for on a given day. Standard when nothing is on. */
export function seasonForDate(date: Date): SeasonKey {
  const today = (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
  for (const entry of SEASON_CALENDAR) {
    const from = ordinal(entry.from);
    const to = ordinal(entry.to);
    // A range such as December to February wraps round the end of the year.
    const within = from <= to ? today >= from && today <= to : today >= from || today <= to;
    if (within) return entry.season;
  }
  return 'none';
}
