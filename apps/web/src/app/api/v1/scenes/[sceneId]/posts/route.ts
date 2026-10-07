import type { PostInput } from '@worldroot/contracts';
import { createPost } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Add an in-character or out-of-character post to a scene. */
export const POST = route<{ sceneId: string }>(async ({ request, actor, params }) => {
  const input = (await readJson(request)) as unknown as PostInput;
  const { db } = await database();
  const post = await createPost(db, actor, params.sceneId, input);
  return Response.json({ post: { id: post.id, seq: post.seq } }, { status: 201 });
});
