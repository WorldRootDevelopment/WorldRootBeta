import type { CharacterInput } from '@worldroot/contracts';
import { characters, communities, roleAssignments, roles, users, type Db } from '@worldroot/db';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { addCharacterToCommunity, createCharacter } from '../characters/service';
import { addMember } from '../community/access';
import { addCharacterField, createCommunity, createRole, listCharacterFields } from '../community/service';
import { createAuth } from '../identity/auth';
import { createProfile, getProfile } from '../identity/profile';
import type { Actor } from '../platform/authorize';
import { copyWorldToCommunity, createLocation, createWorld, type CreateLocationInput } from '../worlds/service';
import { ensureDemoScenes } from './demo-town-scenes';

/**
 * Demo content: a small, ordinary town with a single Narrator character.
 * Deliberately plain, so it shows how WorldRoot works without asking anyone
 * to know a setting or a cast first.
 *
 * It is built through the same services a person would use, so it also
 * exercises the copy model: the world and the Narrator are made in the demo
 * account's library, then copied into the community.
 */

export const DEMO_ACCOUNT = {
  email: 'host@worldroot.test',
  password: 'welcome-to-demo-town',
  handle: 'demo_host',
  displayName: 'Demo Host',
};

export const DEMO_COMMUNITY_SLUG = 'demo-town';

/** The account the earlier Star Trek demo was seeded under. It and what it owns are removed on start. */
const OLD_DEMO_EMAIL = 'demo@worldroot.test';

/** Every account a demo has ever been seeded under. Used only to clear out old demo characters. */
const DEMO_ACCOUNT_EMAILS = [DEMO_ACCOUNT.email, OLD_DEMO_EMAIL];

export const NARRATOR_NAME = 'Narrator';

const NARRATOR: CharacterInput = {
  name: NARRATOR_NAME,
  tagline: 'Tells the story of the town.',
  personality: 'An unseen voice that sets the scene, describes the townsfolk and keeps the story moving.',
  biography: 'Not a person in the town, but the one telling you about it. Use a character like this to run a scene for other writers.',
};

type LocationSeed = Omit<CreateLocationInput, 'parentId' | 'position'> & { children?: LocationSeed[] };

const LOCATIONS: LocationSeed[] = [
  {
    name: 'Town Square',
    summary: 'The middle of everything. Benches, a clock that runs four minutes slow, and a fountain.',
    description: 'Everyone crosses the square at least twice a day. If you wait here long enough, the whole town walks past.',
    children: [{ name: 'The Fountain', summary: 'Where people arrange to meet, and where children are told not to climb.' }],
  },
  {
    name: 'Main Street',
    summary: 'One street of shops, running from the square down to the station.',
    children: [
      {
        name: 'The Corner Café',
        summary: 'Coffee, pie, and the best seat in town for watching the street.',
        description: 'Open early, closes when the last customer leaves. The window table is never free for long.',
      },
      { name: 'Finch & Daughter Books', summary: 'New books at the front, second-hand at the back, a cat somewhere between.' },
      { name: 'The General Store', summary: 'Sells a little of everything and knows what you came in for.' },
    ],
  },
  {
    name: 'Train Station',
    summary: 'Two platforms and a waiting room. Four trains a day, most of them on time.',
    description: 'How most newcomers arrive. The stationmaster has met every one of them.',
  },
  {
    name: 'The Park',
    summary: 'A green slope down to the river, with a path all the way round.',
    children: [{ name: 'The Bandstand', summary: 'Concerts in summer. A good place to shelter from rain the rest of the year.' }],
  },
  { name: 'Town Hall', summary: 'Notices on the board outside, meetings on the first Tuesday of the month.' },
  { name: 'Riverside', summary: 'A quiet walk along the water, out past the last houses.' },
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

/**
 * Removes the characters earlier demos created: everything a demo account
 * plays except the Narrator. Characters belonging to real people are never
 * touched. Posts those characters wrote keep the name they were written under.
 */
async function removeOldDemoCharacters(db: Db): Promise<void> {
  const accounts = await db.select({ id: users.id }).from(users).where(inArray(users.email, DEMO_ACCOUNT_EMAILS));
  if (accounts.length === 0) return;
  await db.delete(characters).where(
    and(
      inArray(
        characters.playerUserId,
        accounts.map((account) => account.id),
      ),
      ne(characters.name, NARRATOR_NAME),
    ),
  );
}

/**
 * Removes the earlier demo entirely: every community its account owns, then
 * the account itself, which takes its library with it. Communities owned by
 * real people are never touched, whatever they are called.
 */
async function removeOldDemo(db: Db): Promise<void> {
  const [old] = await db.select({ id: users.id }).from(users).where(eq(users.email, OLD_DEMO_EMAIL));
  if (!old) return;
  const owned = await db
    .select({ communityId: roleAssignments.communityId })
    .from(roleAssignments)
    .innerJoin(roles, eq(roles.id, roleAssignments.roleId))
    .where(and(eq(roleAssignments.userId, old.id), eq(roles.isOwner, true)));
  if (owned.length > 0) {
    await db.delete(communities).where(
      inArray(
        communities.id,
        owned.map((row) => row.communityId),
      ),
    );
  }
  await db.delete(users).where(eq(users.id, old.id));
}

/** Makes sure the demo community has its Narrator, creating the library original and its community copy if needed. */
async function ensureNarrator(db: Db, actor: Actor, communityId: string): Promise<void> {
  const [present] = await db
    .select({ id: characters.id })
    .from(characters)
    .where(and(eq(characters.communityId, communityId), eq(characters.playerUserId, actor.userId), eq(characters.name, NARRATOR_NAME)));
  if (present) return;

  const original = await createCharacter(db, actor, NARRATOR);
  // Whatever the community asks of every character, the Narrator answers plainly.
  const fields = await listCharacterFields(db, communityId);
  await addCharacterToCommunity(db, actor, original.id, communityId, {
    customValues: Object.fromEntries(fields.filter((field) => field.required).map((field) => [field.id, field.options?.[0] ?? 'Storyteller'])),
  });
}

async function addLocations(db: Db, actor: Actor, worldId: string, seeds: LocationSeed[], parentId: string | null = null) {
  for (const [position, { children, ...seed }] of seeds.entries()) {
    const location = await createLocation(db, actor, worldId, { ...seed, parentId, position });
    if (children) await addLocations(db, actor, worldId, children, location.id);
  }
}

/**
 * Makes someone a member and an owner of the demo community, so it shows among
 * their communities and they can change anything in it. Does nothing if the
 * demo is not there, and nothing new if they already own it.
 */
export async function grantDemoAccess(db: Db, userId: string): Promise<void> {
  const [demo] = await db.select({ id: communities.id }).from(communities).where(eq(communities.slug, DEMO_COMMUNITY_SLUG));
  if (!demo) return;
  await db.transaction(async (tx) => {
    await addMember(tx, demo.id, userId);
    const [ownerRole] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.communityId, demo.id), eq(roles.isOwner, true)));
    if (ownerRole) await tx.insert(roleAssignments).values({ communityId: demo.id, userId, roleId: ownerRole.id }).onConflictDoNothing();
  });
}

export interface DemoSeedResult {
  created: boolean;
  communitySlug: string;
}

/**
 * Creates the demo community once, and keeps its cast to the single Narrator.
 * Running it again changes nothing.
 */
export async function seedDemo(db: Db): Promise<DemoSeedResult> {
  await removeOldDemoCharacters(db);
  await removeOldDemo(db);
  const actor = await ensureDemoActor(db);

  const [existing] = await db.select({ id: communities.id }).from(communities).where(eq(communities.slug, DEMO_COMMUNITY_SLUG));
  if (existing) {
    // Each step stands alone, so a database seeded by an earlier version is brought up to date.
    await ensureNarrator(db, actor, existing.id);
    await ensureDemoScenes(db, actor, existing.id);
    return { created: false, communitySlug: DEMO_COMMUNITY_SLUG };
  }

  const community = await createCommunity(db, actor, {
    slug: DEMO_COMMUNITY_SLUG,
    name: 'Demo Town',
    tagline: 'A small town where nothing much happens, until you arrive.',
    description:
      'A simple place to try WorldRoot. Demo Town is an ordinary small town: a square, a main street, a station, a park. No lore to learn and no rules to memorise.\n\nJoin, add a character, and step into a scene. Or start one of your own anywhere in town.',
    rules: '1. Be kind to the other writers.\n2. Keep in-character and out-of-character apart.\n3. Nobody controls another writer\'s character without asking.',
    accentHue: 155,
    listed: true,
  });

  await createRole(db, actor, community.id, {
    name: 'Moderator',
    position: 100,
    permissions: ['post.remove', 'message.remove', 'character.approve', 'scene.manage', 'announcement.post'],
  });

  await addCharacterField(db, actor, community.id, { label: 'Occupation', type: 'short_text', required: true, position: 0 });

  // The world is built in the demo account's library, then copied in.
  const town = await createWorld(db, actor, {
    slug: 'demo-town',
    name: 'Demo Town',
    summary: 'A small town with a square, a main street, a station and a park.',
    description: 'Somewhere between the city and the coast, four trains a day. Big enough to have a bookshop, small enough that the bookshop knows your name.',
  });
  await addLocations(db, actor, town.id, LOCATIONS);
  await copyWorldToCommunity(db, actor, town.id, community.id);

  await ensureNarrator(db, actor, community.id);
  await ensureDemoScenes(db, actor, community.id);

  return { created: true, communitySlug: DEMO_COMMUNITY_SLUG };
}
