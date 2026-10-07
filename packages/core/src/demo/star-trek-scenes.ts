import { characters, locations, scenes, worlds, type Db } from '@worldroot/db';
import type { BlockNode, InlineNode, RichDoc } from '@worldroot/editor';
import { and, eq } from 'drizzle-orm';
import type { Actor } from '../platform/authorize';
import { createPost, createScene, setSceneStatus } from '../scenes/service';

/** Prose for a demo post: blank lines separate paragraphs, and *asterisks* mark italics. */
function prose(text: string): RichDoc {
  const content: BlockNode[] = text.split(/\n{2,}/).map((paragraph) => ({
    type: 'paragraph',
    content: paragraph
      .split(/(\*[^*]+\*)/)
      .filter(Boolean)
      .map(
        (part): InlineNode =>
          part.startsWith('*') ? { type: 'text', text: part.slice(1, -1), marks: [{ type: 'italic' }] } : { type: 'text', text: part },
      ),
  }));
  return { type: 'doc', content };
}

interface SceneSeed {
  title: string;
  description: string;
  location: string;
  completed?: boolean;
  /** The first post opens the scene. `as` is a crew member's name, or null for narration. */
  posts: Array<{ as: string | null; ooc?: boolean; text: string }>;
}

const SCENES: SceneSeed[] = [
  {
    title: 'Crossing the Line',
    description: 'The Meridian leaves charted space. Open to any bridge officer, and to anyone with a reason to be on deck one.',
    location: 'Main Bridge',
    posts: [
      {
        as: 'Ilara Voss',
        text: `The last navigation buoy slid past the port side and winked out behind them. Ahead, the viewer showed nothing the computer had a name for.

Voss stayed at the rail. She had learned long ago that the chair made a moment feel bigger than it was, and this one was big enough.

"Ensign Marlowe. Take us in. One quarter impulse until Mr. Tevik tells me the sensors are lying less."`,
      },
      {
        as: 'Kaito Marlowe',
        text: `"One quarter impulse, aye." His voice held. His hands, he was fairly sure, also held.

The Meridian eased forward. On his console the long-range plot dissolved into grey static at the edges, the way it had in every simulation. *It is supposed to do that,* he reminded himself. *It did that for everyone.*

Nobody had told him the static would look like weather.`,
      },
      {
        as: 'Tevik',
        text: `Tevik did not look up from the science relay. "Sensor resolution is at forty-one percent and falling, Captain. The interference is not uniform. There is a structure to it."

He paused, which for Tevik was a significant event.

"I would not describe the sensors as lying. I would describe them as being asked a question in a language they do not speak."`,
      },
      {
        as: null,
        ooc: true,
        text: 'Science and engineering, feel free to jump in whenever. Brex would absolutely have invited herself to the bridge for this.',
      },
      {
        as: null,
        text: `Eleven minutes inside the Expanse, every chronometer on the ship disagreed with every other by a little less than a second.

Then, all at once, they agreed again.`,
      },
    ],
  },
  {
    title: 'Last Call',
    description: 'The night before departure. A quiet one, finished.',
    location: 'The Aft Lounge',
    completed: true,
    posts: [
      {
        as: 'Drosk',
        text: `The lounge was empty except for the chief engineer, which in Drosk's experience meant the ship was either in perfect order or about to explode.

He set down a glass that had not been ordered. "On the house."

"You have never said those words in your life."

"I am saying them once. Do not tell the captain. She will think I am unwell."`,
      },
      {
        as: 'Jorah Okonkwo-Reyes',
        text: `Jorah turned the glass a quarter turn and watched the starbase lights slide through it.

"Three years out there, Drosk. Maybe five. I have rebuilt that warp core twice and I still talked myself out of a desk at Utopia Planitia to do this."

*And I would do it again,* he did not say, because it was true and Drosk would charge him for it.`,
      },
      {
        as: 'Drosk',
        text: `"Five years is a long time to keep a tab open." Drosk polished a glass that was already clean. "I find I do not mind."

Outside the aft windows the docking clamps let go, one after another, without a sound.`,
      },
    ],
  },
];

/** Adds the demo scenes to a community that has none. Running it again changes nothing. */
export async function ensureDemoScenes(db: Db, actor: Actor, communityId: string): Promise<void> {
  const [existing] = await db.select({ id: scenes.id }).from(scenes).where(eq(scenes.communityId, communityId)).limit(1);
  if (existing) return;

  const crew = await db
    .select({ id: characters.id, name: characters.name })
    .from(characters)
    .where(and(eq(characters.communityId, communityId), eq(characters.playerUserId, actor.userId)));
  const crewId = (name: string) => crew.find((member) => member.name === name)?.id;

  for (const seed of SCENES) {
    const [place] = await db
      .select({ id: locations.id })
      .from(locations)
      .innerJoin(worlds, eq(worlds.id, locations.worldId))
      .where(and(eq(worlds.ownerCommunityId, communityId), eq(locations.name, seed.location)));
    const cast = [...new Set(seed.posts.flatMap((post) => (post.as ? [post.as] : [])))].map(crewId);
    // A community whose demo content was renamed or removed is left alone.
    if (!place || cast.length === 0 || cast.some((id) => !id)) continue;

    const [opening, ...rest] = seed.posts;
    const scene = await createScene(db, actor, {
      title: seed.title,
      description: seed.description,
      rating: 'everyone',
      locationId: place.id,
      characterIds: cast as string[],
      openingPost: prose(opening!.text),
    });
    for (const post of rest) {
      await createPost(db, actor, scene.id, {
        kind: post.ooc ? 'ooc' : 'ic',
        characterId: post.as ? crewId(post.as) : null,
        content: prose(post.text),
      });
    }
    if (seed.completed) await setSceneStatus(db, actor, scene.id, 'completed');
  }
}
