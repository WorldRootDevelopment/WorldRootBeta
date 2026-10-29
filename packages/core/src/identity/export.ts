import {
  characterImages,
  characters,
  communities,
  locations,
  messages,
  profiles,
  scenePosts,
  scenes,
  stories,
  storyChapters,
  storyCharacters,
  users,
  worlds,
  type Db,
} from '@worldroot/db';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { isDemoGuest } from '../demo/demo-guest';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';

/**
 * Everything a person has made on WorldRoot, gathered into one file they can
 * keep: their profile, characters, worlds, stories, scene posts and messages.
 *
 * Only their own words are included. Other people's posts and messages are
 * not, even where they answer this person's, because they are not theirs to
 * take away. Pictures are listed by address rather than copied in, so the file
 * stays small enough to download.
 */
export interface DataExport {
  format: 'worldroot-export';
  version: 1;
  exportedAt: string;
  account: { email: string; createdAt: string };
  profile: Record<string, unknown> | null;
  characters: Array<Record<string, unknown>>;
  worlds: Array<Record<string, unknown>>;
  stories: Array<Record<string, unknown>>;
  scenePosts: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
}

const picture = (id: string | null) => (id ? `/api/v1/media/${id}` : null);
const iso = (date: Date | null) => (date ? date.toISOString() : null);

export async function exportAccountData(db: Db, actor: Actor): Promise<DataExport> {
  const [user] = await db.select().from(users).where(eq(users.id, actor.userId));
  if (!user) throw new DomainError('not_found', 'That account does not exist.');
  // The shared guest account holds what every visitor wrote, so nobody downloads it as their own.
  if (isDemoGuest(user.email)) throw new DomainError('forbidden', 'The shared demo account cannot be downloaded. Create your own free account for that.');
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, actor.userId));

  const [ownCharacters, ownWorlds, ownStories, posts, sent] = await Promise.all([
    db
      .select({ character: characters, communityName: communities.name })
      .from(characters)
      .leftJoin(communities, eq(communities.id, characters.communityId))
      .where(eq(characters.playerUserId, actor.userId))
      .orderBy(asc(characters.createdAt)),
    db.select().from(worlds).where(eq(worlds.ownerUserId, actor.userId)).orderBy(asc(worlds.createdAt)),
    db.select().from(stories).where(eq(stories.ownerUserId, actor.userId)).orderBy(asc(stories.createdAt)),
    db
      .select({ post: scenePosts, sceneTitle: scenes.title })
      .from(scenePosts)
      .innerJoin(scenes, eq(scenes.id, scenePosts.sceneId))
      .where(and(eq(scenePosts.authorUserId, actor.userId), isNull(scenePosts.removedAt)))
      .orderBy(asc(scenePosts.createdAt)),
    db
      .select({ id: messages.id, conversationId: messages.conversationId, body: messages.body, createdAt: messages.createdAt })
      .from(messages)
      .where(and(eq(messages.authorUserId, actor.userId), isNull(messages.removedAt)))
      .orderBy(asc(messages.createdAt)),
  ]);

  const characterIds = ownCharacters.map((row) => row.character.id);
  const worldIds = ownWorlds.map((world) => world.id);
  const storyIds = ownStories.map((story) => story.id);
  const [gallery, places, chapters, cast] = await Promise.all([
    characterIds.length ? db.select().from(characterImages).where(inArray(characterImages.characterId, characterIds)).orderBy(asc(characterImages.position)) : [],
    worldIds.length ? db.select().from(locations).where(inArray(locations.worldId, worldIds)) : [],
    storyIds.length ? db.select().from(storyChapters).where(inArray(storyChapters.storyId, storyIds)).orderBy(asc(storyChapters.position)) : [],
    storyIds.length
      ? db
          .select({ storyId: storyCharacters.storyId, name: characters.name })
          .from(storyCharacters)
          .innerJoin(characters, eq(characters.id, storyCharacters.characterId))
          .where(inArray(storyCharacters.storyId, storyIds))
      : [],
  ]);

  return {
    format: 'worldroot-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    account: { email: user.email, createdAt: user.createdAt.toISOString() },
    profile: profile
      ? {
          handle: profile.handle,
          displayName: profile.displayName,
          pronouns: profile.pronouns,
          status: profile.status,
          bio: profile.bio,
          playerRoles: profile.playerRoles,
          links: profile.links,
          website: profile.website,
          avatar: picture(profile.avatarMediaId),
          banner: picture(profile.bannerMediaId),
        }
      : null,
    characters: ownCharacters.map(({ character, communityName }) => {
      const { id, playerUserId: _player, docs: _docs, portraitMediaId, communityId: _community, sourceCharacterId, ...fields } = character;
      return {
        id,
        ...fields,
        community: communityName,
        copyOf: sourceCharacterId,
        portrait: picture(portraitMediaId),
        gallery: gallery.filter((image) => image.characterId === id).map((image) => picture(image.mediaId)),
      };
    }),
    worlds: ownWorlds.map((world) => ({
      id: world.id,
      name: world.name,
      summary: world.summary,
      description: world.description,
      createdAt: iso(world.createdAt),
      locations: places.filter((place) => place.worldId === world.id).map(({ id, name, summary, parentId }) => ({ id, name, summary, parentId })),
    })),
    stories: ownStories.map((story) => ({
      id: story.id,
      title: story.title,
      summary: story.summary,
      rating: story.rating,
      visibility: story.visibility,
      createdAt: iso(story.createdAt),
      characters: cast.filter((row) => row.storyId === story.id).map((row) => row.name),
      chapters: chapters.filter((chapter) => chapter.storyId === story.id).map((chapter) => ({ title: chapter.title, text: chapter.contentText, html: chapter.contentHtml, words: chapter.wordCount })),
    })),
    scenePosts: posts.map(({ post, sceneTitle }) => ({
      scene: sceneTitle,
      sceneId: post.sceneId,
      kind: post.kind,
      character: post.characterName,
      text: post.contentText,
      html: post.contentHtml,
      createdAt: iso(post.createdAt),
    })),
    messages: sent.map((message) => ({ conversationId: message.conversationId, text: message.body, createdAt: iso(message.createdAt) })),
  };
}
