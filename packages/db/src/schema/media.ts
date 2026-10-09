import { index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id } from './columns';
import { users } from './identity';

/**
 * An uploaded image. The row records what it is and who uploaded it; the
 * bytes live in media storage under the row's id. A community's copy of a
 * character points at the same row as the original, so an image is removed
 * only when nothing refers to it any more.
 */
export const media = pgTable(
  'media',
  {
    id: id(),
    // Kept when the uploader's account goes, so a shared portrait does not vanish from a community's copy.
    uploaderUserId: uuid('uploader_user_id').references(() => users.id, { onDelete: 'set null' }),
    contentType: text('content_type').notNull(),
    byteSize: integer('byte_size').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('media_uploader_idx').on(t.uploaderUserId)],
);
