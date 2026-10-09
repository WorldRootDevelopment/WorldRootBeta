import { characters, locations, scenes, worlds, type Db } from '@worldroot/db';
import type { BlockNode, InlineNode, RichDoc } from '@worldroot/editor';
import { and, eq } from 'drizzle-orm';
import type { Actor } from '../platform/authorize';
import { createPost, createScene, setSceneStatus } from '../scenes/service';

/** Prose for a demo post: blank lines separate paragraphs, and *asterisks* mark italics. */
export function prose(text: string): RichDoc {
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
  /** The first post opens the scene. `as` is the name of the character speaking, or null for narration. */
  posts: Array<{ as: string | null; ooc?: boolean; text: string }>;
}

const SCENES: SceneSeed[] = [
  {
    title: 'The 11:40',
    description: 'A stranger steps off the late-morning train. Open to anyone with a reason to be at the station.',
    location: 'Train Station',
    posts: [
      {
        as: 'Narrator',
        text: `The train pulled out behind them before Sam had quite decided to stay off it.

One suitcase, one broken wheel. A platform with a painted bench and a hanging basket of flowers that somebody clearly watered. *This is not the end of the line,* Sam thought. *This is not even close.*

The wheel caught in a gap between the paving stones and the suitcase tipped over with a bang that echoed off the station roof.`,
      },
      {
        as: 'Narrator',
        text: `Walt had the suitcase upright before the echo finished.

"That'll be the wheel," he said, as if it were a known local hazard. He took out a small notebook, wrote something, and put it away again. "You've an hour and ten until the next one, if you're going on. If you're not, the café's at the top of Main Street and she does a pie on Thursdays."

He looked at the sky. "It is Thursday."`,
      },
      {
        as: null,
        ooc: true,
        text: 'Anyone is welcome to wander into this one. Add a character of your own and step off the next train, or meet the newcomer up on Main Street.',
      },
      {
        as: 'Narrator',
        text: `The station clock said 11:46. The clock in the square, visible up the hill, said 11:42.

Nobody in town had ever agreed which one was right.`,
      },
    ],
  },
  {
    title: 'Closing Time',
    description: 'The end of a long day at the café. A quiet one, finished.',
    location: 'The Corner Café',
    completed: true,
    posts: [
      {
        as: 'Narrator',
        text: `The last customer had been gone twenty minutes and June was still wiping the same table.

"You're hovering," she said, without turning round.

"I'm browsing." Nora was standing by the cake stand with her coat on. "You have one slice of the lemon left and I am deciding whether I deserve it."`,
      },
      {
        as: 'Narrator',
        text: `"I sold a first edition today," Nora said. "To a man who is going to put it on a shelf and never open it."

She said it the way other people might report a death in the family.

*He was very polite about it,* she did not add, because that had somehow made it worse.`,
      },
      {
        as: 'Narrator',
        text: `June put the slice on a plate and the plate on the counter.

"On the house. Don't tell anyone, I have a reputation." She flipped the sign on the door to CLOSED and, after a moment, pulled out the chair opposite. "Go on, then. Tell me about the book."`,
      },
    ],
  },
];

/** Adds the demo scenes to a community that has none. Running it again changes nothing. */
export async function ensureDemoScenes(db: Db, actor: Actor, communityId: string): Promise<void> {
  const [existing] = await db.select({ id: scenes.id }).from(scenes).where(eq(scenes.communityId, communityId)).limit(1);
  if (existing) return;

  const residents = await db
    .select({ id: characters.id, name: characters.name })
    .from(characters)
    .where(and(eq(characters.communityId, communityId), eq(characters.playerUserId, actor.userId)));
  const residentId = (name: string) => residents.find((resident) => resident.name === name)?.id;

  for (const seed of SCENES) {
    const [place] = await db
      .select({ id: locations.id })
      .from(locations)
      .innerJoin(worlds, eq(worlds.id, locations.worldId))
      .where(and(eq(worlds.ownerCommunityId, communityId), eq(locations.name, seed.location)));
    const cast = [...new Set(seed.posts.flatMap((post) => (post.as ? [post.as] : [])))].map(residentId);
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
        characterId: post.as ? residentId(post.as) : null,
        content: prose(post.text),
      });
    }
    if (seed.completed) await setSceneStatus(db, actor, scene.id, 'completed');
  }
}
