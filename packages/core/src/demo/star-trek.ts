import { communities, users, type Db } from '@worldroot/db';
import { eq } from 'drizzle-orm';
import type { CharacterInput } from '@worldroot/contracts';
import { addCharacterToCommunity, createCharacter } from '../characters/service';
import { addCharacterField, createCommunity, createRole } from '../community/service';
import { createAuth } from '../identity/auth';
import { createProfile, getProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { ensureDemoScenes } from './star-trek-scenes';
import { copyWorldToCommunity, createLocation, createWorld, type CreateLocationInput } from '../worlds/service';

/**
 * Demo content: an original ship and crew in the Star Trek setting.
 * It is built through the same services a person would use, so it also
 * exercises the copy model: worlds and characters are made in the demo
 * account's library, then copied into the community.
 */

export const DEMO_ACCOUNT = {
  email: 'demo@worldroot.test',
  password: 'engage-warp-nine',
  handle: 'meridian_gm',
  displayName: 'Meridian GM',
};

const COMMUNITY_SLUG = 'meridian';

type LocationSeed = Omit<CreateLocationInput, 'parentId' | 'position'> & { children?: LocationSeed[] };

const SHIP_LOCATIONS: LocationSeed[] = [
  {
    name: 'Main Bridge',
    summary: 'Deck 1. The command centre of the ship.',
    description:
      'A compact, efficient bridge: the centre seat, helm and operations forward, tactical behind the rail, science and engineering stations along the aft wall. The main viewer dominates everything.',
    children: [
      { name: "Captain's Ready Room", summary: 'A small office off the bridge, with a view forward.' },
      { name: 'Observation Lounge', summary: 'Briefings, hard conversations and the occasional court of inquiry.' },
    ],
  },
  {
    name: 'Main Engineering',
    summary: 'Deck 11. Two levels wrapped around the warp core.',
    description: 'Loud, warm and never fully tidy. The master systems display covers one wall. The core hums through the deck plates.',
    children: [
      { name: 'Warp Core', summary: 'The upper catwalk and the reactor itself.' },
      { name: 'Jefferies Tubes', summary: 'Crawlways running the length of the ship. Private, if you do not mind kneeling.' },
    ],
  },
  {
    name: 'Sickbay',
    summary: 'Deck 5. Four biobeds, a surgical bay and an office.',
    children: [{ name: 'Medical Lab', summary: 'Where the hard questions get answered at three in the morning.' }],
  },
  {
    name: 'Science Labs',
    summary: 'Deck 8. Modular labs that are rebuilt for every mission.',
    children: [{ name: 'Stellar Cartography', summary: 'A dark, domed room with the Expanse hanging in the air.' }],
  },
  {
    name: 'The Aft Lounge',
    summary: 'Deck 2. The crew lounge, with windows looking back along the warp trail.',
    description: 'Run by Drosk, who insists it is a business. The replicators are free. The good bottles behind the bar are not.',
  },
  { name: 'Holodecks', summary: 'Deck 6. Two suites, booked a week ahead.' },
  { name: 'Transporter Room', summary: 'Deck 4. Where away missions begin and, with luck, end.' },
  { name: 'Shuttlebay', summary: 'Deck 10. Two shuttles, one runabout berth and a lot of cargo netting.' },
  { name: 'Crew Quarters', summary: 'Decks 3 to 9. Home, for now.' },
];

const REGION_LOCATIONS: LocationSeed[] = [
  {
    name: 'Starbase 414',
    summary: 'The last Federation station before the Expanse.',
    description:
      'An ageing station that was a listening post during the war and is now the busiest port in the sector. Starfleet runs it. Everyone else profits from it.',
    children: [
      { name: 'The Promenade', summary: 'Shops, food from forty worlds and more rumours than customs can track.' },
      { name: 'Operations', summary: 'The station command deck.' },
      { name: 'Docking Ring', summary: 'Airlocks, cargo bays and long corridors with bad lighting.' },
    ],
  },
  {
    name: 'The Tessaly Expanse',
    summary: 'Uncharted space beyond the starbase. The reason the Meridian is here.',
    description: 'Dense with subspace interference, the Expanse was skipped by every survey for a century. Long-range sensors are unreliable. Ships go and look.',
    children: [
      {
        name: 'Veyra Prime',
        summary: 'A newly contacted world weighing whether it wants neighbours.',
        children: [
          { name: 'The First City', summary: 'Terraced stone, river canals and a council that votes on everything.' },
          { name: 'The Glass Desert', summary: 'A fused plain older than Veyran history. Nobody on Veyra will say what made it.' },
        ],
      },
      { name: 'The Drift', summary: 'A slow nebula full of wrecks. Some of them are still warm.' },
    ],
  },
];

interface CrewSeed {
  character: CharacterInput;
  rank: string;
  division: string;
  position: string;
}

const CREW: CrewSeed[] = [
  {
    rank: 'Captain',
    division: 'Command',
    position: 'Commanding Officer',
    character: {
      name: 'Ilara Voss',
      tagline: 'Would rather ask one more question than fire one more shot.',
      pronouns: 'she/her',
      age: '47',
      species: 'Human',
      appearance: 'Tall, grey threaded through dark hair she keeps pinned up on duty. Reads padds standing at the rail instead of sitting in the chair.',
      personality: 'Patient and dry. Gives her officers room and expects them to fill it. Slow to anger, and worth avoiding once she gets there.',
      biography:
        'A survey officer for most of her career, Voss spent the war years commanding a hospital ship and has not forgotten it. She asked for the Meridian because nobody else wanted the Expanse.',
      skills: 'First contact protocol, stellar survey, three-dimensional chess.',
      likes: 'Black coffee, old paper charts, crew who argue with her.',
      dislikes: 'Speeches. Being called "ma\'am" off duty.',
    },
  },
  {
    rank: 'Commander',
    division: 'Command',
    position: 'First Officer',
    character: {
      name: 'Tevik',
      tagline: 'Finds the crew illogical. Has stopped expecting otherwise.',
      pronouns: 'he/him',
      age: '82',
      species: 'Vulcan',
      appearance: 'Lean and precise, with a habit of clasping his hands behind his back that the junior officers imitate when he is not looking.',
      personality: 'Exacting and scrupulously fair. His humour exists and is so dry that most of the crew have never noticed it.',
      biography: 'Thirty years in Starfleet security before moving to command. He accepted the first officer post on the condition that he write the duty rosters himself.',
      skills: 'Tactics, logistics, the Vulcan lute.',
      likes: 'A complete report. Silence before the morning watch.',
      dislikes: 'Approximations.',
    },
  },
  {
    rank: 'Lieutenant Commander',
    division: 'Operations',
    position: 'Chief Engineer',
    character: {
      name: 'Jorah Okonkwo-Reyes',
      tagline: 'The ship is fine. The ship is always fine. Do not touch that.',
      pronouns: 'he/him',
      age: '39',
      species: 'Human',
      appearance: 'Broad-shouldered, sleeves always pushed up, a tricorder holstered where a phaser should be.',
      personality: 'Warm, loud and protective of his people and his engines, in that order on most days.',
      biography: 'Raised on a Martian shipyard, he was rebuilding impulse manifolds before he could vote. Turned down a design post at Utopia Planitia to keep his hands on a working ship.',
      skills: 'Warp field theory, improvised repairs, a terrible singing voice used often.',
      likes: 'Night shift in engineering. Real food cooked badly.',
      dislikes: 'The phrase "can you get more power".',
    },
  },
  {
    rank: 'Lieutenant',
    division: 'Medical',
    position: 'Chief Medical Officer',
    character: {
      name: 'Sela Dhen',
      tagline: 'Three lifetimes of bedside manner and still no patience for heroes.',
      pronouns: 'she/her',
      age: '34, and about 210',
      species: 'Trill (joined)',
      appearance: 'Short dark hair, spots running from temple to collar, a medical coat with something in every pocket.',
      personality: 'Blunt with senior officers and gentle with frightened ensigns. Carries the memories of two earlier hosts and argues with both.',
      biography: 'Dhen has been a poet and a freighter pilot. Sela is the first host to practise medicine, and suspects the symbiont finds it stressful.',
      skills: 'Trauma surgery, xenobiology, piloting when nobody is watching.',
      likes: 'Strong tea, patients who follow instructions.',
      dislikes: 'The words "it is only a scratch".',
    },
  },
  {
    rank: 'Lieutenant',
    division: 'Sciences',
    position: 'Chief Science Officer',
    character: {
      name: 'Ysolde Brex',
      tagline: 'Every anomaly is a gift. Some gifts explode.',
      pronouns: 'she/her',
      age: '31',
      species: 'Bolian',
      appearance: 'Bright blue, quick-moving, usually carrying two padds and reading a third over someone else\'s shoulder.',
      personality: 'Delighted by nearly everything. Talks while she thinks, and thinks very fast.',
      biography: 'Published before she graduated. She requested the Expanse because a region with broken sensors is a region full of things nobody has explained yet.',
      skills: 'Subspace physics, sensor analysis, staying awake.',
      likes: 'Unexplained readings. Spiced Bolian soufflé.',
      dislikes: 'Being told a result is "probably a glitch".',
    },
  },
  {
    rank: 'Ensign',
    division: 'Command',
    position: 'Flight Controller',
    character: {
      name: 'Kaito Marlowe',
      tagline: 'Top of his flight class. Eleven days out of the Academy.',
      pronouns: 'he/him',
      age: '23',
      species: 'Human',
      appearance: 'Slight, earnest, uniform pressed sharper than anyone else on the bridge.',
      personality: 'Eager and a little too formal. Brilliant at the helm and unsure of himself everywhere else.',
      biography: 'Grew up on a transport run between Earth and Alpha Centauri and has wanted the helm of a starship since he could see over a console.',
      skills: 'Piloting, astrogation, apologising.',
      likes: 'Manual flight mode. The view from the Aft Lounge.',
      dislikes: 'Being called "kid" by the chief engineer.',
    },
  },
  {
    rank: 'Civilian',
    division: 'Civilian',
    position: 'Proprietor, the Aft Lounge',
    character: {
      name: 'Drosk',
      tagline: 'Listens for free. Everything else has a price.',
      pronouns: 'he/him',
      age: '58',
      species: 'Ferengi',
      appearance: 'Small, sharply dressed, with a jeweller\'s loupe he has no professional reason to carry.',
      personality: 'Mercenary on the surface and sentimental beneath it. Knows every secret on the ship and sells none of them.',
      biography: 'How a Ferengi came to hold the lounge concession on a Starfleet survey ship is a story he tells differently every time.',
      skills: 'Negotiation, mixology, hearing things.',
      likes: 'A full room. A tab paid on time.',
      dislikes: 'Replicated synthehol described as "just as good".',
    },
  },
];

async function ensureDemoActor(db: Db): Promise<Actor> {
  let [user] = await db.select().from(users).where(eq(users.email, DEMO_ACCOUNT.email));
  if (!user) {
    const auth = createAuth({
      db,
      secret: process.env.BETTER_AUTH_SECRET ?? 'dev-only-secret-change-me',
      baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
    });
    await auth.api.signUpEmail({
      body: { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password, name: DEMO_ACCOUNT.displayName },
    });
    [user] = await db.select().from(users).where(eq(users.email, DEMO_ACCOUNT.email));
  }
  const actor: Actor = { userId: user!.id, platformRole: 'user' };
  if (!(await getProfile(db, actor.userId))) {
    await createProfile(db, actor, { handle: DEMO_ACCOUNT.handle, displayName: DEMO_ACCOUNT.displayName, adultConfirmed: true });
  }
  return actor;
}

async function addLocations(db: Db, actor: Actor, worldId: string, seeds: LocationSeed[], parentId: string | null = null) {
  for (const [position, { children, ...seed }] of seeds.entries()) {
    const location = await createLocation(db, actor, worldId, { ...seed, parentId, position });
    if (children) await addLocations(db, actor, worldId, children, location.id);
  }
}

export interface DemoSeedResult {
  created: boolean;
  communitySlug: string;
}

/** Creates the demo community once. Running it again changes nothing. */
export async function seedStarTrekDemo(db: Db): Promise<DemoSeedResult> {
  const [existing] = await db.select({ id: communities.id }).from(communities).where(eq(communities.slug, COMMUNITY_SLUG));
  if (existing) {
    // Scenes are their own step, so a database seeded before they existed still gets them.
    await ensureDemoScenes(db, await ensureDemoActor(db), existing.id);
    return { created: false, communitySlug: COMMUNITY_SLUG };
  }

  const actor = await ensureDemoActor(db);

  const community = await createCommunity(db, actor, {
    slug: COMMUNITY_SLUG,
    name: 'USS Meridian',
    tagline: 'An original crew on the edge of explored space.',
    description:
      'A Star Trek roleplay set in the years after the Dominion War. The USS Meridian, a small survey ship, has been sent into the Tessaly Expanse, a region every chart leaves blank. We write exploration, first contact and the people who share a ship while doing it.\n\nAll crew are original characters. New officers and civilians are always welcome aboard.',
    rules:
      '1. Original characters only. Canon characters may be mentioned, not played.\n2. Keep in-character and out-of-character apart.\n3. Mark the content rating on every scene and respect the boundaries on a character profile.\n4. Nobody controls another writer\'s character without asking.\n5. Senior staff posts are filled by the command team. Ask before you promote yourself.',
    accentHue: 245,
    listed: true,
  });

  await createRole(db, actor, community.id, {
    name: 'Command Staff',
    position: 300,
    permissions: ['community.manage', 'community.invite', 'role.manage', 'member.kick', 'member.ban', 'report.review', 'auditlog.view', 'announcement.post'],
  });
  await createRole(db, actor, community.id, {
    name: 'Game Master',
    position: 200,
    permissions: ['world.manage', 'location.create', 'location.manage', 'scene.manage', 'announcement.post'],
  });
  await createRole(db, actor, community.id, {
    name: 'Personnel Officer',
    position: 100,
    permissions: ['character.approve', 'character.manage', 'characterfield.manage'],
  });

  const rank = await addCharacterField(db, actor, community.id, {
    label: 'Rank',
    type: 'single_choice',
    required: true,
    position: 0,
    options: ['Crewman', 'Ensign', 'Lieutenant Junior Grade', 'Lieutenant', 'Lieutenant Commander', 'Commander', 'Captain', 'Civilian'],
  });
  const division = await addCharacterField(db, actor, community.id, {
    label: 'Division',
    type: 'single_choice',
    required: true,
    position: 1,
    options: ['Command', 'Operations', 'Sciences', 'Medical', 'Civilian'],
  });
  const position = await addCharacterField(db, actor, community.id, {
    label: 'Position',
    type: 'short_text',
    required: true,
    position: 2,
  });

  // Worlds are built in the demo account's library, then copied in.
  const ship = await createWorld(db, actor, {
    slug: 'uss-meridian',
    name: 'USS Meridian',
    summary: 'A small Starfleet survey ship with a crew of 140.',
    description:
      'Fast, lightly armed and built around her sensors and labs. The Meridian was meant for short survey hops. Her assignment to the Expanse will keep her out for years.',
  });
  await addLocations(db, actor, ship.id, SHIP_LOCATIONS);

  const region = await createWorld(db, actor, {
    slug: 'tessaly-expanse',
    name: 'Starbase 414 and the Tessaly Expanse',
    summary: 'The frontier station and the uncharted space beyond it.',
    description: 'Everything off the ship: the starbase the Meridian calls home, and the worlds and hazards she finds past it.',
  });
  await addLocations(db, actor, region.id, REGION_LOCATIONS);

  const shipCopy = await copyWorldToCommunity(db, actor, ship.id, community.id);
  await copyWorldToCommunity(db, actor, region.id, community.id);

  for (const member of CREW) {
    const original = await createCharacter(db, actor, member.character);
    await addCharacterToCommunity(db, actor, original.id, community.id, {
      customValues: { [rank.id]: member.rank, [division.id]: member.division, [position.id]: member.position },
      worldIds: [shipCopy.id],
    });
  }

  await ensureDemoScenes(db, actor, community.id);

  return { created: true, communitySlug: COMMUNITY_SLUG };
}
