import { checkAchievements } from '../identity/achievements';
import {
  MAX_OOC_CHARACTERS,
  MAX_POST_CHARACTERS,
  CONTENT_RATING_LABELS,
  postInputSchema,
  ratingsUpTo,
  sceneInputSchema,
  type PostInput,
  type SceneInput,
  type SceneStatus,
  type BadgeKey,
} from '@worldroot/contracts';
import {
  characters,
  communities,
  locations,
  media,
  profiles,
  sceneCharacters,
  sceneDrafts,
  sceneParticipants,
  scenePostImages,
  scenePostRevisions,
  scenePosts,
  scenes,
  worlds,
  type Db,
} from '@worldroot/db';
import { EMPTY_DOC, InvalidDocumentError, isBlank, parseDoc, renderHtml, toPlainText, type RichDoc } from '@worldroot/editor';
import { and, asc, desc, eq, inArray, isNull, lt, ne, sql } from 'drizzle-orm';
import { communityGrants, isMember } from '../community/service';
import { isBlockedBetween } from '../identity/account';
import { platformBadgesSql, toBadges } from '../identity/badges';
import { notify, notifyMany } from '../notifications/service';
import { recordAudit } from '../platform/audit';
import { authorize, can, type Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { emitEvent } from '../platform/outbox';
import { parseInput } from '../platform/validate';

export type Scene = typeof scenes.$inferSelect;
export type ScenePost = typeof scenePosts.$inferSelect;

const missing = () => new DomainError('not_found', 'That scene does not exist.');

async function requireScene(db: Db, sceneId: string): Promise<Scene> {
  const [scene] = await db.select().from(scenes).where(eq(scenes.id, sceneId));
  if (!scene) throw missing();
  return scene;
}

async function isParticipant(db: Db, userId: string, sceneId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: sceneParticipants.userId })
    .from(sceneParticipants)
    .where(and(eq(sceneParticipants.sceneId, sceneId), eq(sceneParticipants.userId, userId)));
  return Boolean(row);
}

/** The world a scene's location belongs to, for world-scoped permissions. */
async function worldIdOf(db: Db, scene: Scene): Promise<string | null> {
  if (!scene.locationId) return null;
  const [location] = await db.select({ worldId: locations.worldId }).from(locations).where(eq(locations.id, scene.locationId));
  return location?.worldId ?? null;
}

/** A private scene is seen by its participants. A community scene by anyone who can see the community. */
async function canViewScene(db: Db, actor: Actor, scene: Scene): Promise<boolean> {
  if (actor.platformRole === 'staff') return true;
  if (!scene.communityId) return isParticipant(db, actor.userId, scene.id);
  const [community] = await db.select({ listed: communities.listed }).from(communities).where(eq(communities.id, scene.communityId));
  return Boolean(community) && (community!.listed || (await isMember(db, actor.userId, scene.communityId)));
}

async function requireVisibleScene(db: Db, actor: Actor, sceneId: string): Promise<Scene> {
  const scene = await requireScene(db, sceneId);
  // A scene the actor may not see is indistinguishable from one that does not exist.
  if (!(await canViewScene(db, actor, scene))) throw missing();
  return scene;
}

async function canManageScene(db: Db, actor: Actor, scene: Scene): Promise<boolean> {
  if (scene.createdByUserId === actor.userId || actor.platformRole === 'staff') return true;
  if (!scene.communityId) return false;
  return can(actor, 'scene.manage', { communityId: scene.communityId, worldId: await worldIdOf(db, scene) }, communityGrants(db));
}

/**
 * The characters an actor may bring to a scene: their library originals for a
 * private scene, or their approved copies in the community for a community scene.
 */
export async function listEligibleCharacters(db: Db, actor: Actor, communityId: string | null) {
  return db
    .select({ id: characters.id, name: characters.name, tagline: characters.tagline })
    .from(characters)
    .where(
      and(
        eq(characters.playerUserId, actor.userId),
        communityId
          ? and(eq(characters.communityId, communityId), eq(characters.approvalStatus, 'approved'))
          : isNull(characters.communityId),
      ),
    )
    .orderBy(asc(characters.name));
}

async function requireEligible(db: Db, actor: Actor, communityId: string | null, characterIds: string[]) {
  const eligible = new Map((await listEligibleCharacters(db, actor, communityId)).map((character) => [character.id, character]));
  const unique = [...new Set(characterIds)];
  if (unique.some((id) => !eligible.has(id))) {
    const message = communityId
      ? 'Choose characters of yours that this community has approved.'
      : 'Choose characters from your own library.';
    throw new DomainError('invalid_input', message, { fields: { characterIds: message } });
  }
  return unique.map((id) => eligible.get(id)!);
}

function parseContent(input: unknown, maxCharacters: number, mayBeBlank = false): RichDoc {
  let doc: RichDoc;
  try {
    doc = parseDoc(input);
  } catch (error) {
    if (!(error instanceof InvalidDocumentError)) throw error;
    throw new DomainError('invalid_input', 'That post could not be read.', { fields: { content: error.message } });
  }
  if (!mayBeBlank && isBlank(doc)) throw new DomainError('invalid_input', 'Write something first.', { fields: { content: 'Write something first.' } });
  if (toPlainText(doc).length > maxCharacters) {
    const message = `Keep it under ${maxCharacters.toLocaleString('en')} characters.`;
    throw new DomainError('invalid_input', message, { fields: { content: message } });
  }
  return doc;
}

interface NewPost {
  kind: 'ic' | 'ooc' | 'system';
  authorUserId: string;
  characterId: string | null;
  characterName: string | null;
  doc: RichDoc;
}

/** Inserts a post and keeps the scene's counters and the author's read position in step. Call inside a transaction. */
async function insertPost(tx: Db, sceneId: string, post: NewPost): Promise<ScenePost> {
  const ic = post.kind === 'ic';
  // In an UPDATE every right-hand side sees the row as it was, so last_seq + 1 is the new seq in both places.
  const [bumped] = await tx
    .update(scenes)
    .set({
      lastSeq: sql`${scenes.lastSeq} + 1`,
      lastPostAt: new Date(),
      ...(ic
        ? { icPostCount: sql`${scenes.icPostCount} + 1`, lastIcSeq: sql`${scenes.lastSeq} + 1`, lastIcAuthorUserId: post.authorUserId }
        : {}),
    })
    .where(eq(scenes.id, sceneId))
    .returning({ seq: scenes.lastSeq });

  const [row] = await tx
    .insert(scenePosts)
    .values({
      sceneId,
      seq: bumped!.seq,
      kind: post.kind,
      authorUserId: post.authorUserId,
      characterId: post.characterId,
      characterName: post.characterName,
      contentJson: post.doc,
      contentHtml: renderHtml(post.doc),
      contentText: toPlainText(post.doc),
    })
    .returning();

  await tx
    .update(sceneParticipants)
    .set({ lastReadSeq: bumped!.seq })
    .where(and(eq(sceneParticipants.sceneId, sceneId), eq(sceneParticipants.userId, post.authorUserId)));
  await emitEvent(tx, 'scene.post.created', { sceneId, postId: row!.id, seq: row!.seq });
  return row!;
}

/**
 * Starts a scene with its opening post. With a location it is a community scene,
 * open to everyone who can see that location. Without one it is private.
 */
export async function createScene(db: Db, actor: Actor, input: SceneInput): Promise<Scene> {
  const values = parseInput(sceneInputSchema, input);

  let communityId: string | null = null;
  if (values.locationId) {
    const [place] = await db
      .select({ worldId: worlds.id, communityId: worlds.ownerCommunityId })
      .from(locations)
      .innerJoin(worlds, eq(worlds.id, locations.worldId))
      .where(eq(locations.id, values.locationId));
    if (!place?.communityId) {
      throw new DomainError('invalid_input', 'Scenes are set in a community location.', {
        fields: { locationId: 'That location is not in a community.' },
      });
    }
    communityId = place.communityId;
    await authorize(actor, 'scene.create', { communityId, worldId: place.worldId }, communityGrants(db));
    // A community may keep its scenes below a rating. Private scenes answer to nobody but the people in them.
    const [home] = await db.select({ maxRating: communities.maxRating }).from(communities).where(eq(communities.id, communityId));
    const allowed = ratingsUpTo(home?.maxRating ?? 'adult');
    if (!allowed.includes(values.rating)) {
      const message = `Scenes in this community can be rated up to ${CONTENT_RATING_LABELS[allowed.at(-1)!]}.`;
      throw new DomainError('invalid_input', message, { fields: { rating: message } });
    }
  }

  const cast = await requireEligible(db, actor, communityId, values.characterIds);
  const doc = parseContent(values.openingPost, MAX_POST_CHARACTERS);

  const started = await db.transaction(async (tx) => {
    const [scene] = await tx
      .insert(scenes)
      .values({
        communityId,
        locationId: values.locationId ?? null,
        createdByUserId: actor.userId,
        title: values.title,
        description: values.description,
        rating: values.rating,
      })
      .returning();

    await tx.insert(sceneParticipants).values({ sceneId: scene!.id, userId: actor.userId });
    await tx
      .insert(sceneCharacters)
      .values(cast.map((character) => ({ sceneId: scene!.id, characterId: character.id, addedByUserId: actor.userId })));
    await emitEvent(tx, 'scene.created', { sceneId: scene!.id });
    await insertPost(tx, scene!.id, {
      kind: 'ic',
      authorUserId: actor.userId,
      characterId: cast[0]!.id,
      characterName: cast[0]!.name,
      doc,
    });

    const [fresh] = await tx.select().from(scenes).where(eq(scenes.id, scene!.id));
    return fresh!;
  });
  await checkAchievements(db, actor.userId, 'posts');
  await checkAchievements(db, actor.userId, 'scenes');
  return started;
}

const OPEN: SceneStatus[] = ['active', 'on_hold'];

/** Brings one or more of the actor's characters into a scene, joining it if they have not already. */
export async function joinScene(db: Db, actor: Actor, sceneId: string, characterIds: string[]): Promise<void> {
  const scene = await requireVisibleScene(db, actor, sceneId);
  if (!OPEN.includes(scene.status)) throw new DomainError('conflict', 'This scene is closed to new characters.');

  if (scene.communityId) {
    await authorize(actor, 'scene.join', { communityId: scene.communityId, worldId: await worldIdOf(db, scene) }, communityGrants(db));
  } else if (!(await isParticipant(db, actor.userId, sceneId))) {
    throw new DomainError('forbidden', 'This scene is by invitation.');
  }
  if (characterIds.length === 0) {
    throw new DomainError('invalid_input', 'Choose at least one character.', { fields: { characterIds: 'Choose at least one character.' } });
  }
  const cast = await requireEligible(db, actor, scene.communityId, characterIds);

  await db.transaction(async (tx) => {
    const added = await tx
      .insert(sceneParticipants)
      .values({ sceneId, userId: actor.userId })
      .onConflictDoNothing()
      .returning({ userId: sceneParticipants.userId });
    await tx
      .insert(sceneCharacters)
      .values(cast.map((character) => ({ sceneId, characterId: character.id, addedByUserId: actor.userId })))
      .onConflictDoNothing();
    if (added.length > 0) await emitEvent(tx, 'scene.participant.added', { sceneId, userId: actor.userId });
  });
}

/** Invites someone to a private scene by handle. They can then read it and bring a character. */
export async function inviteToScene(db: Db, actor: Actor, sceneId: string, handle: string): Promise<void> {
  const scene = await requireVisibleScene(db, actor, sceneId);
  if (scene.communityId) throw new DomainError('invalid_input', 'Community scenes are open. There is no one to invite.');
  if (!(await isParticipant(db, actor.userId, sceneId))) throw new DomainError('forbidden', 'Only participants can invite.');

  const clean = handle.trim().replace(/^@/, '').toLowerCase();
  const [profile] = clean ? await db.select({ userId: profiles.userId }).from(profiles).where(eq(profiles.handleLower, clean)) : [];
  if (!profile) throw new DomainError('not_found', 'No one has that handle.', { fields: { handle: 'No one has that handle.' } });
  if (await isBlockedBetween(db, actor.userId, profile.userId)) {
    throw new DomainError('forbidden', 'You cannot invite this person.', { fields: { handle: 'You cannot invite this person.' } });
  }

  await db.transaction(async (tx) => {
    const added = await tx
      .insert(sceneParticipants)
      .values({ sceneId, userId: profile.userId, invitedByUserId: actor.userId })
      .onConflictDoNothing()
      .returning({ userId: sceneParticipants.userId });
    if (added.length > 0) {
      await emitEvent(tx, 'scene.participant.added', { sceneId, userId: profile.userId });
      await notify(tx, {
        userId: profile.userId,
        type: 'scene.invite',
        groupKey: `scene:${sceneId}:invite`,
        subject: scene.title,
        href: `/scenes/${sceneId}`,
        actorUserId: actor.userId,
      });
    }
  });
}

/** Adds an in-character or out-of-character post. In-character with no character is narration. */
/** The scene, for a participant about to add to it. Refuses anyone who has not joined, and any scene in an archived community. */
async function requireJoinedScene(db: Db, actor: Actor, sceneId: string): Promise<Scene> {
  const scene = await requireVisibleScene(db, actor, sceneId);
  if (!(await isParticipant(db, actor.userId, sceneId))) throw new DomainError('forbidden', 'Join the scene before posting.');
  if (scene.communityId) {
    const [home] = await db.select({ archivedAt: communities.archivedAt }).from(communities).where(eq(communities.id, scene.communityId));
    if (home?.archivedAt) throw new DomainError('conflict', 'This community is archived, so its scenes are closed.');
  }
  return scene;
}

/** The scene, for a participant about to add to its story. Also refuses a scene that is closed to new posts. */
export async function getSceneForPosting(db: Db, actor: Actor, sceneId: string): Promise<Scene> {
  const scene = await requireJoinedScene(db, actor, sceneId);
  if (!OPEN.includes(scene.status)) throw new DomainError('conflict', 'This scene is closed to new posts.');
  return scene;
}

/** Adds a note written by WorldRoot itself, such as a dice roll, to a scene's story. Call inside a transaction. */
export function insertSystemPost(tx: Db, sceneId: string, post: Omit<NewPost, 'kind'>): Promise<ScenePost> {
  return insertPost(tx, sceneId, { ...post, kind: 'system' });
}

export async function createPost(db: Db, actor: Actor, sceneId: string, input: PostInput): Promise<ScenePost> {
  const values = parseInput(postInputSchema, input);
  const scene = await requireJoinedScene(db, actor, sceneId);

  if (values.kind === 'ooc') {
    if (scene.status === 'archived') throw new DomainError('conflict', 'This scene is archived.');
    const doc = parseContent(values.content, MAX_OOC_CHARACTERS);
    return db.transaction((tx) =>
      insertPost(tx, sceneId, { kind: 'ooc', authorUserId: actor.userId, characterId: null, characterName: null, doc }),
    );
  }

  if (!OPEN.includes(scene.status)) throw new DomainError('conflict', 'This scene is closed to new posts.');
  const imageIds = [...new Set(values.imageIds ?? [])];
  // A post may be pictures alone.
  const doc = parseContent(values.content, MAX_POST_CHARACTERS, imageIds.length > 0);
  if (imageIds.length > 0) {
    // Only pictures this person uploaded, and only ones no post already shows.
    const found = await db
      .select({ id: media.id, uploader: media.uploaderUserId, postId: scenePostImages.postId })
      .from(media)
      .leftJoin(scenePostImages, eq(scenePostImages.mediaId, media.id))
      .where(inArray(media.id, imageIds));
    if (found.length !== imageIds.length || found.some((image) => image.uploader !== actor.userId || image.postId)) {
      const message = 'One of those images could not be attached. Add it again.';
      throw new DomainError('invalid_input', message, { fields: { images: message } });
    }
  }

  let character: { id: string; name: string } | null = null;
  if (values.characterId) {
    const [row] = await db
      .select({ id: characters.id, name: characters.name })
      .from(sceneCharacters)
      .innerJoin(characters, eq(characters.id, sceneCharacters.characterId))
      .where(
        and(
          eq(sceneCharacters.sceneId, sceneId),
          eq(sceneCharacters.characterId, values.characterId),
          eq(characters.playerUserId, actor.userId),
        ),
      );
    if (!row) {
      const message = 'Post as one of your characters in this scene, or as the narrator.';
      throw new DomainError('invalid_input', message, { fields: { characterId: message } });
    }
    character = row;
  }

  const posted = await db.transaction(async (tx) => {
    const post = await insertPost(tx, sceneId, {
      kind: 'ic',
      authorUserId: actor.userId,
      characterId: character?.id ?? null,
      characterName: character?.name ?? null,
      doc,
    });
    if (imageIds.length > 0) {
      await tx.insert(scenePostImages).values(imageIds.map((mediaId, position) => ({ postId: post.id, mediaId, position })));
    }
    await tx.delete(sceneDrafts).where(and(eq(sceneDrafts.sceneId, sceneId), eq(sceneDrafts.userId, actor.userId)));
    const others = await tx.select({ userId: sceneParticipants.userId }).from(sceneParticipants).where(eq(sceneParticipants.sceneId, sceneId));
    await notifyMany(
      tx,
      others.map((other) => other.userId),
      {
        type: 'scene.post',
        groupKey: `scene:${sceneId}:posts`,
        subject: scene.title,
        href: `/scenes/${sceneId}#post-${post.seq}`,
        actorUserId: actor.userId,
        preview: post.contentText || 'Posted a picture.',
      },
    );
    return post;
  });
  await checkAchievements(db, actor.userId, 'posts');
  return posted;
}

/** Whether the actor may remove posts they did not write: community moderators and platform staff. */
async function canRemoveOthersPosts(db: Db, actor: Actor, scene: Scene): Promise<boolean> {
  if (actor.platformRole === 'staff') return true;
  if (!scene.communityId) return false;
  return can(actor, 'post.remove', { communityId: scene.communityId, worldId: await worldIdOf(db, scene) }, communityGrants(db));
}

/** Whether the actor may see a scene at all. Used to guard the live event stream. */
export async function canAccessScene(db: Db, actor: Actor, sceneId: string): Promise<boolean> {
  const [scene] = await db.select().from(scenes).where(eq(scenes.id, sceneId));
  return scene ? canViewScene(db, actor, scene) : false;
}

async function requirePost(db: Db, actor: Actor, postId: string): Promise<{ post: ScenePost; scene: Scene }> {
  const [post] = await db.select().from(scenePosts).where(eq(scenePosts.id, postId));
  if (!post) throw new DomainError('not_found', 'That post does not exist.');
  return { post, scene: await requireVisibleScene(db, actor, post.sceneId) };
}

/** Rewrites a post. Only its author may, and what it said before is kept as a revision. */
export async function editPost(db: Db, actor: Actor, postId: string, content: unknown): Promise<ScenePost> {
  const { post, scene } = await requirePost(db, actor, postId);
  if (post.authorUserId !== actor.userId || post.kind === 'system') throw new DomainError('forbidden', 'Only its author can edit a post.');
  if (post.removedAt) throw new DomainError('conflict', 'This post has been removed.');
  if (scene.status === 'archived') throw new DomainError('conflict', 'This scene is archived.');
  const doc = parseContent(content, post.kind === 'ooc' ? MAX_OOC_CHARACTERS : MAX_POST_CHARACTERS);

  return db.transaction(async (tx) => {
    await tx.insert(scenePostRevisions).values({ postId, contentJson: post.contentJson, editedByUserId: actor.userId });
    const [updated] = await tx
      .update(scenePosts)
      .set({ contentJson: doc, contentHtml: renderHtml(doc), contentText: toPlainText(doc), editedAt: new Date() })
      .where(eq(scenePosts.id, postId))
      .returning();
    await emitEvent(tx, 'scene.post.updated', { sceneId: post.sceneId, postId, seq: post.seq });
    return updated!;
  });
}

/**
 * Removes a post, leaving a marker in its place so the scene keeps its shape.
 * Its author may, and in a community so may anyone who holds "Remove posts".
 */
export async function removePost(db: Db, actor: Actor, postId: string): Promise<{ sceneId: string }> {
  const { post, scene } = await requirePost(db, actor, postId);
  if (post.removedAt) return { sceneId: post.sceneId };
  const own = post.authorUserId === actor.userId;
  if (!own) {
    if (scene.communityId && actor.platformRole !== 'staff') {
      await authorize(actor, 'post.remove', { communityId: scene.communityId, worldId: await worldIdOf(db, scene) }, communityGrants(db));
    } else if (actor.platformRole !== 'staff') {
      throw new DomainError('forbidden', 'Only its author can remove this post.');
    }
  }

  await db.transaction(async (tx) => {
    await tx.update(scenePosts).set({ removedAt: new Date(), removedByUserId: actor.userId }).where(eq(scenePosts.id, postId));
    // Removing someone else's words is a moderation action and is recorded as one.
    if (!own) {
      await recordAudit(tx, {
        actor,
        action: 'post.remove',
        targetType: 'scene_post',
        targetId: postId,
        communityId: scene.communityId,
        before: { authorUserId: post.authorUserId, seq: post.seq, kind: post.kind },
      });
      if (post.authorUserId) {
        await notify(tx, {
          userId: post.authorUserId,
          type: 'post.removed',
          groupKey: `scene:${post.sceneId}:removed`,
          subject: scene.title,
          href: `/scenes/${post.sceneId}#post-${post.seq}`,
        });
      }
    }
    await emitEvent(tx, 'scene.post.updated', { sceneId: post.sceneId, postId, seq: post.seq });
  });
  return { sceneId: post.sceneId };
}

export interface PostPage {
  posts: Array<
    ScenePost & {
      authorName: string | null;
      authorHandle: string | null;
      authorBadges: BadgeKey[];
      /** The ids of the pictures under the post, in order, served from /api/v1/media. */
      images: string[];
      /** Written by the viewer. */
      mine: boolean;
      /** Who removed it, when it has been removed. Its content is then withheld. */
      removedBy: 'author' | 'moderator' | null;
    }
  >;
  /** The viewer may remove other people's posts here. */
  viewerCanModerate: boolean;
  /** True when older posts exist before the first one returned. */
  hasEarlier: boolean;
}

/**
 * A page of one stream, oldest first. `story` is the in-character stream with
 * its system notes; `ooc` is the out-of-character stream beside it.
 */
export async function listPosts(
  db: Db,
  actor: Actor,
  sceneId: string,
  options: { stream: 'story' | 'ooc'; beforeSeq?: number; limit?: number },
): Promise<PostPage> {
  const scene = await requireVisibleScene(db, actor, sceneId);
  const limit = Math.min(options.limit ?? 50, 100);
  const rows = await db
    .select({ post: scenePosts, authorName: profiles.displayName, authorHandle: profiles.handle, authorBadges: platformBadgesSql })
    .from(scenePosts)
    .leftJoin(profiles, eq(profiles.userId, scenePosts.authorUserId))
    .where(
      and(
        eq(scenePosts.sceneId, sceneId),
        options.stream === 'ooc' ? eq(scenePosts.kind, 'ooc') : ne(scenePosts.kind, 'ooc'),
        options.beforeSeq ? lt(scenePosts.seq, options.beforeSeq) : undefined,
      ),
    )
    .orderBy(desc(scenePosts.seq))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const attached =
    page.length === 0
      ? []
      : await db
          .select()
          .from(scenePostImages)
          .where(
            inArray(
              scenePostImages.postId,
              page.map((row) => row.post.id),
            ),
          )
          .orderBy(asc(scenePostImages.position));

  return {
    posts: page
      .reverse()
      .map(({ post, authorName, authorHandle, authorBadges }) => ({
        ...post,
        // A removed post keeps its place in the scene, but its words are not sent to anyone.
        ...(post.removedAt ? { contentJson: EMPTY_DOC, contentHtml: '', contentText: '' } : {}),
        authorName,
        authorHandle,
        authorBadges: toBadges(authorBadges),
        // A removed post's pictures are withheld along with its words.
        images: post.removedAt ? [] : attached.filter((image) => image.postId === post.id).map((image) => image.mediaId),
        mine: post.authorUserId === actor.userId,
        removedBy: post.removedAt ? (post.removedByUserId === post.authorUserId ? ('author' as const) : ('moderator' as const)) : null,
      })),
    viewerCanModerate: await canRemoveOthersPosts(db, actor, scene),
    hasEarlier: rows.length > limit,
  };
}

export interface SceneView {
  scene: Scene;
  /** Where a community scene sits. Null for a private scene. */
  place: {
    community: { slug: string; name: string; accentHue: number };
    world: { slug: string; name: string } | null;
    location: { id: string; name: string } | null;
  } | null;
  participants: Array<{ userId: string; displayName: string; handle: string; badges: BadgeKey[] }>;
  cast: Array<{ id: string; name: string; playerUserId: string | null }>;
  /** Dice can be rolled here: the scene's community has DnD mode on. */
  dice: boolean;
  viewer: {
    isParticipant: boolean;
    canManage: boolean;
    /** May write in-character now: a participant in an open scene. */
    canPost: boolean;
    /** The viewer's characters already in the scene. */
    characters: Array<{ id: string; name: string }>;
    /** Characters the viewer could still bring. Empty when they may not join. */
    canBring: Array<{ id: string; name: string }>;
    lastReadSeq: number;
    draft: { characterId: string | null; content: RichDoc } | null;
  };
}

export async function getSceneView(db: Db, actor: Actor, sceneId: string): Promise<SceneView> {
  const scene = await requireVisibleScene(db, actor, sceneId);

  let place: SceneView['place'] = null;
  let dice = false;
  if (scene.communityId) {
    const [community] = await db.select().from(communities).where(eq(communities.id, scene.communityId));
    dice = Boolean(community?.dndMode);
    const [spot] = scene.locationId
      ? await db
          .select({ locationId: locations.id, locationName: locations.name, worldSlug: worlds.slug, worldName: worlds.name })
          .from(locations)
          .innerJoin(worlds, eq(worlds.id, locations.worldId))
          .where(eq(locations.id, scene.locationId))
      : [];
    place = {
      community: { slug: community!.slug, name: community!.name, accentHue: community!.accentHue },
      world: spot ? { slug: spot.worldSlug, name: spot.worldName } : null,
      location: spot ? { id: spot.locationId, name: spot.locationName } : null,
    };
  }

  const people = await db
    .select({
      userId: sceneParticipants.userId,
      displayName: profiles.displayName,
      handle: profiles.handle,
      badges: platformBadgesSql,
      lastReadSeq: sceneParticipants.lastReadSeq,
    })
    .from(sceneParticipants)
    .innerJoin(profiles, eq(profiles.userId, sceneParticipants.userId))
    .where(eq(sceneParticipants.sceneId, sceneId))
    .orderBy(asc(sceneParticipants.joinedAt));

  const cast = await db
    .select({ id: characters.id, name: characters.name, playerUserId: characters.playerUserId })
    .from(sceneCharacters)
    .innerJoin(characters, eq(characters.id, sceneCharacters.characterId))
    .where(eq(sceneCharacters.sceneId, sceneId))
    .orderBy(asc(sceneCharacters.joinedAt));

  const me = people.find((person) => person.userId === actor.userId);
  const open = OPEN.includes(scene.status);
  const mine = cast.filter((character) => character.playerUserId === actor.userId);

  // A private scene admits only people already invited. A community scene admits anyone allowed to join.
  const mayJoin =
    open &&
    (scene.communityId
      ? await can(actor, 'scene.join', { communityId: scene.communityId, worldId: await worldIdOf(db, scene) }, communityGrants(db))
      : Boolean(me));
  const inScene = new Set(cast.map((character) => character.id));
  const canBring = mayJoin
    ? (await listEligibleCharacters(db, actor, scene.communityId)).filter((character) => !inScene.has(character.id))
    : [];

  const [draft] = me
    ? await db
        .select()
        .from(sceneDrafts)
        .where(and(eq(sceneDrafts.sceneId, sceneId), eq(sceneDrafts.userId, actor.userId)))
    : [];

  return {
    scene,
    place,
    participants: people.map(({ userId, displayName, handle, badges }) => ({ userId, displayName, handle, badges: toBadges(badges) })),
    cast,
    dice,
    viewer: {
      isParticipant: Boolean(me),
      canManage: await canManageScene(db, actor, scene),
      canPost: Boolean(me) && open,
      characters: mine.map(({ id, name }) => ({ id, name })),
      canBring: canBring.map(({ id, name }) => ({ id, name })),
      lastReadSeq: me?.lastReadSeq ?? 0,
      draft: draft ? { characterId: draft.characterId, content: draft.contentJson as RichDoc } : null,
    },
  };
}

/** Moves a scene through its lifecycle. Its creator may, and in a community so may anyone who manages scenes. */
export async function setSceneStatus(db: Db, actor: Actor, sceneId: string, status: SceneStatus): Promise<Scene> {
  const scene = await requireVisibleScene(db, actor, sceneId);
  if (!(await canManageScene(db, actor, scene))) throw new DomainError('forbidden', 'Only the scene’s creator can change its status.');

  const changed = await db.transaction(async (tx) => {
    const [updated] = await tx.update(scenes).set({ status }).where(eq(scenes.id, sceneId)).returning();
    if (scene.communityId) {
      await recordAudit(tx, {
        actor,
        action: 'scene.status',
        targetType: 'scene',
        targetId: sceneId,
        communityId: scene.communityId,
        before: { status: scene.status },
        after: { status },
      });
    }
    await emitEvent(tx, 'scene.updated', { sceneId });
    return updated!;
  });
  // Finishing a scene is its creator's achievement, whoever marked it complete.
  if (status === 'completed' && scene.createdByUserId) await checkAchievements(db, scene.createdByUserId, 'scenes');
  return changed;
}

/** Records how far the actor has read. The position only ever moves forward. */
export async function markSceneRead(db: Db, actor: Actor, sceneId: string, seq: number): Promise<void> {
  if (!Number.isInteger(seq) || seq < 0) return;
  await db
    .update(sceneParticipants)
    .set({
      lastReadSeq: sql`greatest(${sceneParticipants.lastReadSeq}, least(${seq}::int, (select ${scenes.lastSeq} from ${scenes} where ${scenes.id} = ${sceneId})))`,
    })
    .where(and(eq(sceneParticipants.sceneId, sceneId), eq(sceneParticipants.userId, actor.userId)));
}

/** Saves the actor's unsent post. Saving an empty document clears it. */
export async function saveDraft(
  db: Db,
  actor: Actor,
  sceneId: string,
  input: { characterId?: string | null; content: unknown },
): Promise<void> {
  if (!(await isParticipant(db, actor.userId, sceneId))) throw missing();
  let doc: RichDoc;
  try {
    doc = parseDoc(input.content);
  } catch {
    throw new DomainError('invalid_input', 'That draft could not be read.');
  }
  const key = and(eq(sceneDrafts.sceneId, sceneId), eq(sceneDrafts.userId, actor.userId));
  if (isBlank(doc)) {
    await db.delete(sceneDrafts).where(key);
    return;
  }
  const characterId = input.characterId ?? null;
  await db
    .insert(sceneDrafts)
    .values({ sceneId, userId: actor.userId, characterId, contentJson: doc })
    .onConflictDoUpdate({
      target: [sceneDrafts.sceneId, sceneDrafts.userId],
      set: { characterId, contentJson: doc, updatedAt: new Date() },
    });
}

export interface SceneSetup {
  /** The community location the scene will be set in. Null for a private scene. */
  place: {
    communitySlug: string;
    communityName: string;
    accentHue: number;
    worldSlug: string;
    worldName: string;
    locationId: string;
    locationName: string;
    /** The highest rating a scene here may be given. */
    maxRating: string;
  } | null;
  /** Characters the actor may open the scene with. */
  characters: Array<{ id: string; name: string; tagline: string | null }>;
  canCreate: boolean;
}

/** What the new-scene form needs: where the scene will sit and who the actor can bring. */
export async function getSceneSetup(db: Db, actor: Actor, locationId: string | null): Promise<SceneSetup> {
  if (!locationId) return { place: null, characters: await listEligibleCharacters(db, actor, null), canCreate: true };

  const [spot] = await db
    .select({ location: locations, world: worlds, community: communities })
    .from(locations)
    .innerJoin(worlds, eq(worlds.id, locations.worldId))
    .innerJoin(communities, eq(communities.id, worlds.ownerCommunityId))
    .where(eq(locations.id, locationId));
  const visible =
    spot && (spot.community.listed || actor.platformRole === 'staff' || (await isMember(db, actor.userId, spot.community.id)));
  if (!spot || !visible) throw new DomainError('not_found', 'That location does not exist.');

  return {
    place: {
      communitySlug: spot.community.slug,
      communityName: spot.community.name,
      accentHue: spot.community.accentHue,
      worldSlug: spot.world.slug,
      worldName: spot.world.name,
      locationId: spot.location.id,
      locationName: spot.location.name,
      maxRating: spot.community.maxRating,
    },
    characters: await listEligibleCharacters(db, actor, spot.community.id),
    canCreate: await can(actor, 'scene.create', { communityId: spot.community.id, worldId: spot.world.id }, communityGrants(db)),
  };
}

export interface SceneSummary {
  scene: Scene;
  communityName: string | null;
  locationName: string | null;
  cast: string[];
}

async function summarize(db: Db, rows: Scene[]): Promise<SceneSummary[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((scene) => scene.id);
  const names = await db
    .select({ sceneId: sceneCharacters.sceneId, name: characters.name })
    .from(sceneCharacters)
    .innerJoin(characters, eq(characters.id, sceneCharacters.characterId))
    .where(inArray(sceneCharacters.sceneId, ids))
    .orderBy(asc(sceneCharacters.joinedAt));
  const communityIds = [...new Set(rows.flatMap((scene) => (scene.communityId ? [scene.communityId] : [])))];
  const locationIds = [...new Set(rows.flatMap((scene) => (scene.locationId ? [scene.locationId] : [])))];
  const communityNames = communityIds.length
    ? await db.select({ id: communities.id, name: communities.name }).from(communities).where(inArray(communities.id, communityIds))
    : [];
  const locationNames = locationIds.length
    ? await db.select({ id: locations.id, name: locations.name }).from(locations).where(inArray(locations.id, locationIds))
    : [];
  const communityById = new Map(communityNames.map((row) => [row.id, row.name]));
  const locationById = new Map(locationNames.map((row) => [row.id, row.name]));

  return rows.map((scene) => ({
    scene,
    communityName: scene.communityId ? (communityById.get(scene.communityId) ?? null) : null,
    locationName: scene.locationId ? (locationById.get(scene.locationId) ?? null) : null,
    cast: names.filter((row) => row.sceneId === scene.id).map((row) => row.name),
  }));
}

export interface MyScene extends SceneSummary {
  unread: number;
  /** The story is open and the latest in-character post is someone else's. */
  waitingOnYou: boolean;
}

/** Every scene the user takes part in: those waiting on them first, then the most recently active. */
export async function listMyScenes(db: Db, userId: string): Promise<MyScene[]> {
  const rows = await db
    .select({ scene: scenes, lastReadSeq: sceneParticipants.lastReadSeq })
    .from(sceneParticipants)
    .innerJoin(scenes, eq(scenes.id, sceneParticipants.sceneId))
    .where(eq(sceneParticipants.userId, userId))
    .orderBy(desc(scenes.lastPostAt));
  const readBy = new Map(rows.map((row) => [row.scene.id, row.lastReadSeq]));
  const summaries = await summarize(
    db,
    rows.map((row) => row.scene),
  );
  return summaries
    .map((summary) => ({
      ...summary,
      unread: Math.max(0, summary.scene.lastSeq - (readBy.get(summary.scene.id) ?? 0)),
      waitingOnYou: summary.scene.status === 'active' && summary.scene.lastIcAuthorUserId !== userId,
    }))
    .sort((a, b) => Number(b.waitingOnYou) - Number(a.waitingOnYou));
}

/** The scenes set in a location, most recently active first. Archived scenes are left out. */
export async function listLocationScenes(db: Db, locationId: string): Promise<SceneSummary[]> {
  const rows = await db
    .select()
    .from(scenes)
    .where(and(eq(scenes.locationId, locationId), ne(scenes.status, 'archived')))
    .orderBy(desc(scenes.lastPostAt));
  return summarize(db, rows);
}
