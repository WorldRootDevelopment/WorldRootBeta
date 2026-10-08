/**
 * World templates: ready-made starting points a writer can copy into their
 * library and then change freely. A template is data in this file, not a row
 * in the database, so adding one is a code change that ships with a release.
 *
 * Several templates are named for existing franchises, at the product owner's
 * direction. Each holds place names and short original descriptions only; no
 * text is taken from the source works. Using these names on a public service
 * is a trademark question that needs legal review before launch.
 */

export const TEMPLATE_CATEGORIES = ['Everyday', 'Fantasy', 'Science fiction', 'Superheroes'] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export interface TemplateLocation {
  name: string;
  summary?: string;
  children?: TemplateLocation[];
}

/** A character field a community running this world would probably want. Shown as a suggestion. */
export interface TemplateField {
  label: string;
  /** Example answers or the list of choices, for the person setting up a community. */
  examples?: string[];
}

export interface WorldTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  /** Set when the template is based on an existing franchise. Shown as a "Pop culture" label. */
  popCulture: boolean;
  summary: string;
  description: string;
  locations: TemplateLocation[];
  suggestedFields: TemplateField[];
}

export const WORLD_TEMPLATES: WorldTemplate[] = [
  {
    id: 'basic-town',
    name: 'Basic Town',
    category: 'Everyday',
    popCulture: false,
    summary: 'A small modern town. The simplest place to start.',
    description:
      'An ordinary town with everything a slice-of-life story needs and nothing it does not. Rename it, move it to any country or decade, and add the places your characters go.',
    locations: [
      { name: 'Town Square', summary: 'The middle of everything.', children: [{ name: 'The Fountain', summary: 'Where people arrange to meet.' }] },
      {
        name: 'Main Street',
        summary: 'One street of shops.',
        children: [
          { name: 'The Café', summary: 'Coffee, gossip and the best window seat in town.' },
          { name: 'The Bookshop', summary: 'New at the front, second-hand at the back.' },
          { name: 'The General Store', summary: 'A little of everything.' },
        ],
      },
      { name: 'The School', summary: 'Classrooms, a hall and a playing field.' },
      { name: 'Train Station', summary: 'How newcomers arrive.' },
      { name: 'The Park', summary: 'A green slope down to the river.' },
      { name: 'Town Hall', summary: 'Notices outside, meetings inside.' },
      { name: 'The Outskirts', summary: 'Farms, back roads and the edge of the woods.' },
    ],
    suggestedFields: [{ label: 'Occupation', examples: ['Teacher', 'Shopkeeper', 'Student'] }],
  },
  {
    id: 'dungeons-and-dragons',
    name: 'Dungeons & Dragons',
    category: 'Fantasy',
    popCulture: true,
    summary: 'A starting village, the wilds beyond it, a dungeon and a distant city.',
    description:
      'A classic adventuring region in the Dungeons & Dragons mould: somewhere safe to begin, somewhere dangerous to go, and somewhere grand to aim for. The place names are placeholders, ready to be replaced with your own campaign setting.',
    locations: [
      {
        name: 'The Village of Oakhollow',
        summary: 'A quiet village at a crossroads. Every adventure starts here.',
        children: [
          { name: 'The Gilded Flagon', summary: 'The tavern. Rumours, hired swords and a notice board.' },
          { name: 'The Adventurers’ Guild Hall', summary: 'Contracts posted daily.' },
          { name: 'The Shrine', summary: 'Healing, for a donation.' },
          { name: 'The Smithy', summary: 'Arms, armour and repairs.' },
        ],
      },
      {
        name: 'The Wilds',
        summary: 'Forest, hills and an old road nobody maintains.',
        children: [
          { name: 'The Old Road', summary: 'Merchants travel it in groups, or not at all.' },
          { name: 'The Goblin Warrens', summary: 'A cave system in the hills.' },
          { name: 'The Standing Stones', summary: 'Older than the kingdom, and humming.' },
        ],
      },
      {
        name: 'The Sunken Keep',
        summary: 'A ruined fortress, half swallowed by the marsh.',
        children: [
          { name: 'The Gatehouse', summary: 'The way in. Somebody has been here recently.' },
          { name: 'The Flooded Halls', summary: 'Knee-deep water and whatever lives in it.' },
          { name: 'The Crypts', summary: 'The dead were sealed in for a reason.' },
          { name: 'The Vault', summary: 'What everyone came for.' },
        ],
      },
      {
        name: 'The City of Highgate',
        summary: 'Capital of the realm, three weeks’ ride away.',
        children: [
          { name: 'The Grand Market', summary: 'Anything can be bought.' },
          { name: 'The Arcane College', summary: 'Wizards, libraries and strict rules.' },
          { name: 'The Royal Palace', summary: 'Where quests are handed down.' },
        ],
      },
    ],
    suggestedFields: [
      { label: 'Class', examples: ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'] },
      { label: 'Level' },
      { label: 'Species', examples: ['Human', 'Elf', 'Dwarf', 'Halfling', 'Tiefling', 'Dragonborn'] },
      { label: 'Background', examples: ['Soldier', 'Acolyte', 'Criminal', 'Sage'] },
      { label: 'Alignment' },
    ],
  },
  {
    id: 'wizarding-school',
    name: 'Wizarding School: Varrowmere',
    category: 'Fantasy',
    popCulture: false,
    summary: 'Varrowmere Academy, a school of magic on a tidal island. An original WorldRoot universe, free for anyone to use.',
    description:
      'In the Kindled World, magic is a spark that anyone might carry and a few learn to feed. Varrowmere Academy teaches them, on an island reached by a causeway that the sea covers twice a day. Students live in one of five Hearths, which they choose for themselves, and work magic through a focus they make with their own hands. This universe is original to WorldRoot. Use it, change it and build on it however you like.',
    locations: [
      { name: 'The Causeway', summary: 'The only road to the island. Passable at low tide, gone at high.', children: [{ name: 'The Gatehouse', summary: 'Where arrivals wait for the water to fall.' }] },
      { name: 'The Lantern Hall', summary: 'Meals, assemblies and the Kindling Night. One lantern hangs here for every student.' },
      {
        name: 'The Five Hearths',
        summary: 'Where students live. Nobody is sorted: each student chooses a Hearth after their Wandering Term.',
        children: [
          { name: 'Ashgrove Hearth', summary: 'Makers and menders. Warm, crowded and always building something.' },
          { name: 'Tidewatch Hearth', summary: 'Patient observers, in the sea-facing tower.' },
          { name: 'Stonereach Hearth', summary: 'Keepers of promises and old things, in the cellars and undercrofts.' },
          { name: 'Galecrest Hearth', summary: 'Restless and quick, in the rooms at the top of the cliff stair.' },
          { name: 'Starfall Hearth', summary: 'Night owls and question-askers, under the observatory dome.' },
        ],
      },
      {
        name: 'The Teaching Wing',
        summary: 'Six disciplines, six sets of rooms.',
        children: [
          { name: 'The Lumenwork Studio', summary: 'Light, colour and illusion. Blackout curtains on every window.' },
          { name: 'The Binding Room', summary: 'Wards, oaths and agreements. Nothing said here is said lightly.' },
          { name: 'The Glasshouses', summary: 'Rootlore: plants that heal, plants that harm, plants that listen.' },
          { name: 'The Tide Observatory', summary: 'Tidereading: what the sea knows about what comes next.' },
          { name: 'The Menagerie Walk', summary: 'Beastfriending. The animals are colleagues, not specimens.' },
          { name: 'The Mending Ward', summary: 'Healing, taught beside the academy infirmary.' },
        ],
      },
      { name: 'The Unshelved Library', summary: 'The books choose their own order. The lowest floor is sealed.' },
      {
        name: 'The Grounds',
        summary: 'Clifftop lawns, tidepools and a wood the sea reclaims twice a day.',
        children: [
          { name: 'The Kitefall Field', summary: 'Where the Hearths race storm-kites for the season lantern.' },
          { name: 'The Tidepools', summary: 'First-years gather the makings of their focus here.' },
          { name: 'The Drowned Wood', summary: 'Out of bounds at high tide. Mostly out of bounds at low tide too.' },
        ],
      },
      { name: 'Saltmarket', summary: 'The mainland town across the causeway. Ordinary people, ordinary shops, and very good chips.' },
    ],
    suggestedFields: [
      { label: 'Hearth', examples: ['Ashgrove', 'Tidewatch', 'Stonereach', 'Galecrest', 'Starfall', 'Wandering Term (not yet chosen)'] },
      { label: 'Year', examples: ['First year', 'Fourth year', 'Seventh year', 'Evening student', 'Staff'] },
      { label: 'Focus', examples: ['A whittled ring', 'A bone needle', 'A sea-glass pendant'] },
      { label: 'Strongest discipline', examples: ['Lumenwork', 'Binding', 'Rootlore', 'Tidereading', 'Beastfriending', 'Mending'] },
    ],
  },
  {
    id: 'star-wars',
    name: 'Star Wars',
    category: 'Science fiction',
    popCulture: true,
    summary: 'A galaxy far, far away: a desert spaceport, the capital world, a rebel base and an Imperial warship.',
    description:
      'A handful of the galaxy’s best-known places, as a starting map. Set it in any era by changing who holds the capital and who is hiding in the jungle.',
    locations: [
      {
        name: 'Tatooine',
        summary: 'A desert world on the Outer Rim, far from anyone who might ask questions.',
        children: [
          {
            name: 'Mos Eisley',
            summary: 'A spaceport town.',
            children: [{ name: 'The Cantina', summary: 'Pilots for hire. No droids.' }, { name: 'Docking Bay 94' }],
          },
          { name: 'The Jundland Wastes', summary: 'Canyons, scavengers and worse.' },
          { name: 'A Moisture Farm', summary: 'Hard work and a long horizon.' },
        ],
      },
      {
        name: 'Coruscant',
        summary: 'The city that covers a planet. Seat of galactic government.',
        children: [{ name: 'The Senate District' }, { name: 'The Jedi Temple' }, { name: 'The Underworld', summary: 'Thousands of levels down, where the sun never reaches.' }],
      },
      {
        name: 'Yavin 4',
        summary: 'A jungle moon with ancient temples and a hidden base.',
        children: [{ name: 'The Hangar' }, { name: 'The Command Centre' }, { name: 'The Jungle' }],
      },
      {
        name: 'An Imperial Star Destroyer',
        summary: 'A mile of warship.',
        children: [{ name: 'The Bridge' }, { name: 'The Hangar Bay' }, { name: 'The Detention Block' }],
      },
      {
        name: 'A Light Freighter',
        summary: 'Your ship. She may not look like much.',
        children: [{ name: 'The Cockpit' }, { name: 'The Main Hold' }, { name: 'The Smuggling Compartments' }],
      },
    ],
    suggestedFields: [
      { label: 'Species', examples: ['Human', 'Twi’lek', 'Wookiee', 'Rodian', 'Droid'] },
      { label: 'Affiliation', examples: ['Rebel Alliance', 'Galactic Empire', 'Jedi Order', 'Bounty Hunters’ Guild', 'Independent'] },
      { label: 'Role', examples: ['Pilot', 'Smuggler', 'Soldier', 'Senator'] },
      { label: 'Force-sensitive', examples: ['Yes', 'No', 'Unknown'] },
    ],
  },
  {
    id: 'jurassic-park',
    name: 'Jurassic Park',
    category: 'Science fiction',
    popCulture: true,
    summary: 'An island theme park of living dinosaurs. The fences are holding. For now.',
    description:
      'The island resort, from the visitor centre to the paddocks to the parts guests never see. Play it on opening day, or on the day everything stops working.',
    locations: [
      {
        name: 'The Visitor Centre',
        summary: 'Where every tour begins.',
        children: [{ name: 'The Rotunda', summary: 'Skeletons overhead.' }, { name: 'The Laboratory', summary: 'Where the animals are made.' }, { name: 'The Control Room', summary: 'Every fence and gate, on one screen.' }],
      },
      {
        name: 'The Paddocks',
        summary: 'The reason people come.',
        children: [
          { name: 'The Tyrannosaur Paddock' },
          { name: 'The Raptor Pen', summary: 'Reinforced. Twice.' },
          { name: 'Herbivore Valley', summary: 'Open grassland and gentle giants.' },
          { name: 'The Aviary' },
        ],
      },
      { name: 'The Tour Road', summary: 'Electric vehicles on a fixed track.' },
      { name: 'The Staff Village', summary: 'Bunkhouses, a canteen and a bar.' },
      { name: 'The East Dock', summary: 'The last boat leaves at seven.' },
      { name: 'The Maintenance Shed', summary: 'Where the power is switched back on. Far side of the island.' },
      { name: 'The Restricted Zone', summary: 'Not on the map given to guests.' },
    ],
    suggestedFields: [
      { label: 'Job', examples: ['Palaeontologist', 'Game warden', 'Geneticist', 'Systems engineer', 'Guest'] },
      { label: 'Department', examples: ['Science', 'Animal control', 'Operations', 'Security', 'Visitor'] },
      { label: 'Clearance level' },
    ],
  },
  {
    id: 'dc-comics',
    name: 'DC Comics',
    category: 'Superheroes',
    popCulture: true,
    summary: 'Gotham, Metropolis and the places heroes gather.',
    description:
      'The best-known cities of the DC universe and a few places beyond them. Bring established heroes, or put a new one on a rooftop and see who notices.',
    locations: [
      {
        name: 'Gotham City',
        summary: 'Rain, gargoyles and a signal in the sky.',
        children: [
          { name: 'Wayne Manor' },
          { name: 'The Batcave' },
          { name: 'GCPD Headquarters' },
          { name: 'Arkham Asylum' },
          { name: 'The Narrows' },
        ],
      },
      {
        name: 'Metropolis',
        summary: 'The city of tomorrow.',
        children: [{ name: 'The Daily Planet' }, { name: 'LexCorp Tower' }, { name: 'Centennial Park' }],
      },
      { name: 'Central City', summary: 'Fast-moving, in every sense.' },
      { name: 'The Hall of Justice', summary: 'Where the League meets.' },
      { name: 'Themyscira', summary: 'An island hidden from the world of men.' },
      { name: 'Atlantis', summary: 'A kingdom beneath the sea.' },
    ],
    suggestedFields: [
      { label: 'Alias' },
      { label: 'Powers and abilities' },
      { label: 'Alignment', examples: ['Hero', 'Villain', 'Antihero', 'Civilian'] },
      { label: 'Team', examples: ['Justice League', 'Teen Titans', 'None'] },
    ],
  },
  {
    id: 'marvel-comics',
    name: 'Marvel Comics',
    category: 'Superheroes',
    popCulture: true,
    summary: 'New York City and the wider Marvel universe.',
    description:
      'Marvel’s heroes mostly live in a real city, so this template starts in New York and reaches out from there to a school, a hidden kingdom and another realm.',
    locations: [
      {
        name: 'New York City',
        summary: 'Where most of it happens.',
        children: [
          { name: 'Avengers Tower' },
          { name: 'Hell’s Kitchen', summary: 'Street-level trouble.' },
          { name: 'The Daily Bugle' },
          { name: 'The Sanctum Sanctorum', summary: 'A townhouse on Bleecker Street that is larger inside.' },
          { name: 'Queens', summary: 'A friendly neighbourhood.' },
        ],
      },
      {
        name: 'Xavier’s School for Gifted Youngsters',
        summary: 'A school in Westchester with an unusual curriculum.',
        children: [{ name: 'The Classrooms' }, { name: 'The Danger Room' }, { name: 'The Grounds' }],
      },
      { name: 'The S.H.I.E.L.D. Helicarrier', summary: 'A flying command centre.' },
      { name: 'Wakanda', summary: 'A hidden nation, far ahead of the rest of the world.', children: [{ name: 'The Golden City' }] },
      { name: 'Asgard', summary: 'A realm of gods, reached by a bridge of light.' },
    ],
    suggestedFields: [
      { label: 'Alias' },
      { label: 'Powers and abilities' },
      { label: 'Alignment', examples: ['Hero', 'Villain', 'Antihero', 'Civilian'] },
      { label: 'Team', examples: ['Avengers', 'X-Men', 'Fantastic Four', 'None'] },
    ],
  },
];

export const findTemplate = (id: string): WorldTemplate | undefined => WORLD_TEMPLATES.find((template) => template.id === id);

/** How many places a template holds, at every depth. */
export const countLocations = (locations: TemplateLocation[]): number =>
  locations.reduce((total, location) => total + 1 + countLocations(location.children ?? []), 0);
