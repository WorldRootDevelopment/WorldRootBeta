import type { CharacterInput } from '@worldroot/contracts';
import { communities, locations, worlds, type Db } from '@worldroot/db';
import { and, eq } from 'drizzle-orm';
import { addCharacterToCommunity, createCharacter } from '../characters/service';
import { updateCommunity } from '../community/admin';
import { addCharacterField, createCommunity, createRole } from '../community/service';
import type { Actor } from '../platform/authorize';
import { rollInScene } from '../scenes/rolls';
import { createPost, createScene } from '../scenes/service';
import { copyWorldToCommunity, createWorld } from '../worlds/service';
import { addLocations, DUNGEON_MASTER_NAME, ensureDemoActor, SAMPLE_ADVENTURER_NAME, type DemoSeedResult, type LocationSeed } from './demo-town';
import { prose } from './demo-town-scenes';

/**
 * A second demo community, for tabletop-style play. It has DnD mode switched
 * on, a small original adventuring region, a Dungeon Master and one sample
 * adventurer, and a scene that already contains dice rolls, so a visitor can
 * see what a roll looks like before making one.
 *
 * The setting is original. It follows the shape of a Dungeons & Dragons
 * adventure (an inn, a road, a ruin) without using any published place,
 * character or text.
 */

export const DND_DEMO_COMMUNITY_SLUG = 'demo-dungeon';

const CLASSES = ['Dungeon Master', 'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard', 'Something else'];

const DUNGEON_MASTER: CharacterInput = {
  name: DUNGEON_MASTER_NAME,
  tagline: 'Describes the world, plays everyone you meet, and asks for the rolls.',
  personality: 'Fair, patient, and fond of a door that should not be opened.',
  biography: 'Not an adventurer, but the voice of the adventure. Use a character like this to run a table: set the scene, speak for the villagers and the monsters, and say what the dice mean.',
};

const ADVENTURER: CharacterInput = {
  name: SAMPLE_ADVENTURER_NAME,
  tagline: 'A caravan guard who is tired of guarding other people’s fortunes.',
  species: 'Human',
  age: 'Early thirties',
  appearance: 'Broad, weathered, and never far from a shield with three old dents in it. Keeps his hair cropped and his boots mended.',
  personality: 'Steady and plain-spoken. Counts the exits. Tips well.',
  biography: 'Ten years walking beside wagons on the Old Road taught Brannoch two things: where the bandits wait, and that nobody ever got rich being paid by the day. He came to Thornwick on a rumour about the barrow.',
  skills: 'Sword and shield, reading a road, lifting things other people have given up on.',
};

const LOCATIONS: LocationSeed[] = [
  {
    name: 'The Dragon’s Rest',
    summary: 'The inn at the crossroads. Every adventure in the vale starts or ends here.',
    description: 'Low beams, a long fire, and a notice board by the door that the innkeeper pretends not to read. Rooms upstairs, stabling behind.',
    children: [
      { name: 'Common Room', summary: 'Tables, a hearth, and whoever blew in on the last cart.' },
      { name: 'The Notice Board', summary: 'Work for anyone with a sword, a spellbook or a strong stomach.' },
    ],
  },
  {
    name: 'Thornwick Village',
    summary: 'Forty houses, one market and a great many opinions.',
    children: [
      { name: 'Market Green', summary: 'Stalls twice a week. The smith and the herbalist every day.' },
      { name: 'Shrine of the Lantern', summary: 'A small shrine kept by one overworked acolyte. Healing, for a donation.' },
    ],
  },
  {
    name: 'The Old Road',
    summary: 'A day’s walk of cracked paving between the village and the hills.',
    description: 'Older than the kingdom. The milestones are carved in a script nobody in Thornwick can read.',
    children: [{ name: 'Wolfpine Wood', summary: 'Where the road narrows and the trees lean in.' }],
  },
  {
    name: 'Barrow of the Hollow King',
    summary: 'A burial mound in the hills, sealed for six hundred years. Until last month.',
    description: 'Shepherds found the outer stone cracked after the spring storms. Nobody has admitted to going in.',
    children: [
      { name: 'Antechamber', summary: 'Cold, dry, and lined with carvings of people looking away.' },
      { name: 'The Sealed Door', summary: 'Black stone, no handle, and scratches on the inside edge.' },
    ],
  },
];

async function locationId(db: Db, communityId: string, name: string): Promise<string | null> {
  const [place] = await db
    .select({ id: locations.id })
    .from(locations)
    .innerJoin(worlds, eq(worlds.id, locations.worldId))
    .where(and(eq(worlds.ownerCommunityId, communityId), eq(locations.name, name)));
  return place?.id ?? null;
}

/** The numbers the seeded rolls come up with, so the story written around them makes sense. */
const fixed = (...values: number[]) => () => values.shift()!;

async function addScenes(db: Db, actor: Actor, communityId: string, dm: string, adventurer: string): Promise<void> {
  const antechamber = await locationId(db, communityId, 'Antechamber');
  const commonRoom = await locationId(db, communityId, 'Common Room');
  if (!antechamber || !commonRoom) return;

  const door = await createScene(db, actor, {
    title: 'The Sealed Door',
    description: 'First steps into the barrow. A short example of play with dice.',
    rating: 'teen',
    locationId: antechamber,
    characterIds: [dm, adventurer],
    openingPost: prose(`The torchlight reaches the end of the antechamber and stops against a slab of black stone.

There is no handle. There is no keyhole. Along the bottom edge, where the door meets the floor, the stone is worn pale by something that has been pushed against it many times, *from the other side*.

What do you do?`),
  });
  const say = (characterId: string, text: string) => createPost(db, actor, door.id, { kind: 'ic', characterId, content: prose(text) });

  await say(adventurer, `Brannoch set the torch in a crack in the wall and looked at the door the way he looked at a wagon stuck in a ford.

"It opens outward," he said. "So it can be made to." He put his shoulder to the stone, found his footing, and heaved.`);
  await rollInScene(db, actor, door.id, { notation: 'd20+5', characterId: adventurer, reason: 'to force the door (Strength)' }, fixed(14));
  await say(dm, `Nineteen. The door needed fifteen.

It moves a hand's width with a sound like a millstone, and cold air comes through the gap, and with it a smell of old dust and something sweeter underneath.

Then the ceiling above the doorway shifts. Whoever built this place did not intend the door to be opened quietly.`);
  await rollInScene(db, actor, door.id, { notation: '2d6', characterId: dm, reason: 'for the falling stones' }, fixed(3, 4));
  await say(dm, `Seven. A slab the size of a table comes down where Brannoch was standing a moment ago and takes a strip out of his shield arm on the way.

When the dust settles the door stands half open. Beyond it, a stair goes down, and on the third step somebody has left a lantern. It is still warm.`);
  await createPost(db, actor, door.id, {
    kind: 'ooc',
    content: prose('Dice are switched on in this community. Add a character, join the scene, and use “Roll dice” under the post box. The roll is made by WorldRoot and goes into the story where everyone can see it.'),
  });

  const notice = await createScene(db, actor, {
    title: 'Work for the Willing',
    description: 'A new notice has gone up at the inn. Open to any adventurer passing through.',
    rating: 'teen',
    locationId: commonRoom,
    characterIds: [dm],
    openingPost: prose(`The rain has kept everyone indoors, which is how half of Thornwick comes to be in the common room when the innkeeper nails a fresh sheet to the board.

*Wanted: persons of courage to recover a lantern, property of the Shrine, last seen going into the barrow in the hands of an acolyte who should have known better. Payment on return. Of the lantern, or the acolyte, or ideally both.*

The room goes quiet in the way a room does when everyone is waiting for someone else to stand up.`),
  });
  await createPost(db, actor, notice.id, {
    kind: 'ooc',
    content: prose('Bring a character of your own and take the job. Say what they do; the Dungeon Master will tell you when to roll.'),
  });
}

/**
 * Creates the DnD demo community once. Running it again changes nothing, so
 * anything its owners have altered since is left alone.
 */
export async function seedDndDemo(db: Db): Promise<DemoSeedResult> {
  const [existing] = await db.select({ id: communities.id }).from(communities).where(eq(communities.slug, DND_DEMO_COMMUNITY_SLUG));
  if (existing) return { created: false, communitySlug: DND_DEMO_COMMUNITY_SLUG };
  const actor = await ensureDemoActor(db);

  const settings = {
    name: 'Demo Dungeon',
    tagline: 'A small D&D table: an inn, a road, and a barrow with something in it.',
    description:
      'A place to try tabletop-style roleplay on WorldRoot. Demo Dungeon has DnD mode switched on, so anyone writing in a scene can roll dice and have the result recorded in the story.\n\nRead “The Sealed Door” to see how a roll looks, then add a character and answer the notice at the inn.',
    rules:
      '1. The Dungeon Master describes the world and says what a roll means. Players say what their characters try.\n2. Roll in the scene, not in your head. A roll made here is one everyone can trust.\n3. Nobody decides what happens to another writer’s character without asking.\n4. Keep table talk in the out-of-character panel.',
    accentHue: 12,
    listed: true,
  };
  const community = await createCommunity(db, actor, { slug: DND_DEMO_COMMUNITY_SLUG, ...settings });
  await updateCommunity(db, actor, community.id, { ...settings, requireCharacterApproval: false, dndMode: true });

  await createRole(db, actor, community.id, {
    name: 'Dungeon Master',
    position: 100,
    permissions: ['post.remove', 'message.remove', 'character.approve', 'scene.manage', 'announcement.post', 'world.manage', 'location.create', 'location.manage'],
  });

  const classField = await addCharacterField(db, actor, community.id, { label: 'Class', type: 'single_choice', options: CLASSES, required: true, position: 0 });
  const levelField = await addCharacterField(db, actor, community.id, { label: 'Level', type: 'number', position: 1 });
  await addCharacterField(db, actor, community.id, { label: 'Background', type: 'short_text', position: 2 });

  // The world is built in the demo account's library, then copied in.
  const vale = await createWorld(db, actor, {
    slug: 'thornwick-vale',
    name: 'Thornwick Vale',
    summary: 'A village, an inn at the crossroads, an old road, and a barrow in the hills.',
    description:
      'A quiet valley at the edge of the kingdom, where the most exciting thing in a generation was the year the river froze. Then the spring storms cracked the stone on the Hollow King’s barrow, and now there are strangers at the inn asking the way to the hills.',
  });
  await addLocations(db, actor, vale.id, LOCATIONS);
  await copyWorldToCommunity(db, actor, vale.id, community.id);

  const dm = await addCharacterToCommunity(db, actor, (await createCharacter(db, actor, DUNGEON_MASTER)).id, community.id, {
    customValues: { [classField.id]: 'Dungeon Master' },
  });
  const adventurer = await addCharacterToCommunity(db, actor, (await createCharacter(db, actor, ADVENTURER)).id, community.id, {
    customValues: { [classField.id]: 'Fighter', [levelField.id]: 1 },
  });
  await addScenes(db, actor, community.id, dm.id, adventurer.id);

  return { created: true, communitySlug: DND_DEMO_COMMUNITY_SLUG };
}
