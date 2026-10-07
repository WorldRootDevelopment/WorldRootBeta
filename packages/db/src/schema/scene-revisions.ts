import { index, jsonb, pgTable, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './columns';
import { users } from './identity';
import { scenePosts } from './scenes';

/** What a post said before each edit. Kept so moderation can see what was changed. */
export const scenePostRevisions = pgTable(
  'scene_post_revisions',
  {
    id: id(),
    postId: uuid('post_id')
      .notNull()
      .references(() => scenePosts.id, { onDelete: 'cascade' }),
    // The content that was replaced, as it stood before the edit.
    contentJson: jsonb('content_json').notNull(),
    editedByUserId: uuid('edited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('scene_post_revisions_post_idx').on(t.postId, t.createdAt)],
);
