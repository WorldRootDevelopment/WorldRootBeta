import { exportStory } from '@worldroot/core';
import { route } from '@/lib/api';
import { database } from '@/lib/server';

/** Download a story as a Markdown file. Anyone who may read it may download it. */
export const GET = route<{ storyId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  const { filename, text } = await exportStory(db, actor, params.storyId);
  return new Response(text, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'x-content-type-options': 'nosniff',
    },
  });
});
