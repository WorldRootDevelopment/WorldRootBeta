import type { ContentRating } from '@worldroot/contracts';
import { communities, locations, scenePostImages, scenePosts, scenes, type Db } from '@worldroot/db';
import { and, asc, count, eq, gt, inArray, isNotNull, isNull, lt, lte, ne, sql } from 'drizzle-orm';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { canAccessScene } from './service';

/**
 * The Chronicle: a community's finished scenes, read in the order they were
 * finished, as the chapters of one ongoing book.
 *
 * Nothing is copied or moved. A chapter is a scene that has been marked
 * complete; its number is its place among the community's finished scenes, so
 * numbers shift only if an earlier scene is reopened. Who may read a chapter
 * is exactly who may read the scene.
 */

/** How many posts one chapter page shows. A longer scene is still a single chapter; the reader says when it is cut short. */
export const CHAPTER_POST_LIMIT = 500;

export interface ChapterSummary {
  sceneId: string;
  /** Its place in the book, starting at 1. */
  number: number;
  title: string;
  description: string | null;
  rating: ContentRating;
  locationName: string | null;
  /** Everyone who speaks in it, in order of first appearance. */
  characters: string[];
  postCount: number;
  startedAt: Date;
  completedAt: Date;
}

const finished = (communityId: string) => and(eq(scenes.communityId, communityId), isNotNull(scenes.completedAt));

/** The table of contents: every finished scene in a community, oldest first. The caller has already checked the community may be seen. */
export async function listChapters(db: Db, communityId: string): Promise<ChapterSummary[]> {
  const rows = await db
    .select({ scene: scenes, locationName: locations.name })
    .from(scenes)
    .leftJoin(locations, eq(locations.id, scenes.locationId))
    .where(finished(communityId))
    .orderBy(asc(scenes.completedAt), asc(scenes.createdAt));
  if (rows.length === 0) return [];

  const speakers = await db
    .select({ sceneId: scenePosts.sceneId, name: scenePosts.characterName, first: sql<number>`min(${scenePosts.seq})` })
    .from(scenePosts)
    .where(
      and(
        inArray(
          scenePosts.sceneId,
          rows.map((row) => row.scene.id),
        ),
        eq(scenePosts.kind, 'ic'),
        isNull(scenePosts.removedAt),
        isNotNull(scenePosts.characterName),
      ),
    )
    .groupBy(scenePosts.sceneId, scenePosts.characterName)
    .orderBy(sql`min(${scenePosts.seq})`);

  return rows.map(({ scene, locationName }, index) => ({
    sceneId: scene.id,
    number: index + 1,
    title: scene.title,
    description: scene.description,
    rating: scene.rating,
    locationName,
    characters: speakers.filter((speaker) => speaker.sceneId === scene.id).map((speaker) => speaker.name!),
    postCount: scene.icPostCount,
    startedAt: scene.createdAt,
    completedAt: scene.completedAt!,
  }));
}

export interface Chapter {
  sceneId: string;
  number: number;
  /** How many chapters the book has now. */
  of: number;
  title: string;
  description: string | null;
  rating: ContentRating;
  locationName: string | null;
  completedAt: Date;
  community: { slug: string; name: string };
  /** The story only: in-character posts and the notes WorldRoot wrote into it, such as dice rolls. */
  posts: Array<{ id: string; seq: number; kind: 'ic' | 'system'; characterName: string | null; contentHtml: string; images: string[] }>;
  /** True when the scene has more posts than one chapter page shows. */
  cutShort: boolean;
  previous: { sceneId: string; title: string } | null;
  next: { sceneId: string; title: string } | null;
}

/** One chapter, for reading. Refused, as if it did not exist, for anyone who may not see the scene or a scene that is not finished. */
export async function getChapter(db: Db, actor: Actor, sceneId: string): Promise<Chapter> {
  const missing = new DomainError('not_found', 'That chapter does not exist.');
  // A malformed id is a chapter that cannot exist; let the database say so the same way.
  if (!(await canAccessScene(db, actor, sceneId))) throw missing;
  const [row] = await db
    .select({ scene: scenes, locationName: locations.name, community: { slug: communities.slug, name: communities.name, chronicle: communities.chronicle } })
    .from(scenes)
    .innerJoin(communities, eq(communities.id, scenes.communityId))
    .leftJoin(locations, eq(locations.id, scenes.locationId))
    .where(eq(scenes.id, sceneId));
  if (!row?.scene.completedAt || !row.scene.communityId || !row.community.chronicle) throw missing;
  const { scene } = row;
  const completedAt = scene.completedAt!;

  const neighbour = { sceneId: scenes.id, title: scenes.title };
  const [[before], [total], [previous], [next], posts] = await Promise.all([
    db.select({ value: count() }).from(scenes).where(and(finished(scene.communityId!), lte(scenes.completedAt, completedAt))),
    db.select({ value: count() }).from(scenes).where(finished(scene.communityId!)),
    db.select(neighbour).from(scenes).where(and(finished(scene.communityId!), lt(scenes.completedAt, completedAt))).orderBy(sql`${scenes.completedAt} desc`).limit(1),
    db.select(neighbour).from(scenes).where(and(finished(scene.communityId!), gt(scenes.completedAt, completedAt))).orderBy(asc(scenes.completedAt)).limit(1),
    db
      .select()
      .from(scenePosts)
      .where(and(eq(scenePosts.sceneId, sceneId), ne(scenePosts.kind, 'ooc'), isNull(scenePosts.removedAt)))
      .orderBy(asc(scenePosts.seq))
      .limit(CHAPTER_POST_LIMIT + 1),
  ]);
  const shown = posts.slice(0, CHAPTER_POST_LIMIT);
  const attached =
    shown.length === 0
      ? []
      : await db
          .select()
          .from(scenePostImages)
          .where(
            inArray(
              scenePostImages.postId,
              shown.map((post) => post.id),
            ),
          )
          .orderBy(asc(scenePostImages.position));

  return {
    sceneId,
    number: before?.value ?? 1,
    of: total?.value ?? 1,
    title: scene.title,
    description: scene.description,
    rating: scene.rating,
    locationName: row.locationName,
    completedAt,
    community: { slug: row.community.slug, name: row.community.name },
    posts: shown.map((post) => ({
      id: post.id,
      seq: post.seq,
      kind: post.kind === 'system' ? 'system' : 'ic',
      characterName: post.characterName,
      contentHtml: post.contentHtml,
      images: attached.filter((image) => image.postId === post.id).map((image) => image.mediaId),
    })),
    cutShort: posts.length > CHAPTER_POST_LIMIT,
    previous: previous ?? null,
    next: next ?? null,
  };
}
