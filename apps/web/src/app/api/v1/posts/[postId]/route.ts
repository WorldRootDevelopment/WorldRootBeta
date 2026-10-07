import { editPost, removePost } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { publish } from '@/lib/live';
import { database } from '@/lib/server';

/** Rewrite a post. Only its author may. */
export const PATCH = route<{ postId: string }>(async ({ request, actor, params }) => {
  const { content } = await readJson(request);
  const { db } = await database();
  const post = await editPost(db, actor, params.postId, content);
  publish({ type: 'scene.post.updated', sceneId: post.sceneId, seq: post.seq });
  return new Response(null, { status: 204 });
});

/** Remove a post, leaving a marker in its place. Its author may, and so may community moderators. */
export const DELETE = route<{ postId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  const { sceneId } = await removePost(db, actor, params.postId);
  publish({ type: 'scene.post.updated', sceneId });
  return new Response(null, { status: 204 });
});
