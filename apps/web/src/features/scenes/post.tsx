import type { PostPage } from '@worldroot/core';
import { CharacterAvatar } from '@/features/characters/character-card';

type Post = PostPage['posts'][number];

const when = (date: Date) => date.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * One in-character post. The character leads; the writer is credited quietly.
 * The HTML was rendered on the server from a validated document, so it is safe to insert.
 */
export function StoryPost({ post }: { post: Post }) {
  const narration = !post.characterName;
  return (
    <article id={`post-${post.seq}`} className="scroll-mt-24">
      <header className="mb-4 flex items-center gap-3">
        {narration ? null : <CharacterAvatar name={post.characterName!} className="size-10 text-base" />}
        <div className="min-w-0">
          <p className={narration ? 'text-sm font-medium uppercase tracking-wide text-ink-muted' : 'font-serif text-lg font-semibold text-ink'}>
            {narration ? 'Narration' : post.characterName}
          </p>
          <p className="text-xs text-ink-muted">
            {post.authorHandle ? `Written by @${post.authorHandle}` : 'Written by a former member'}
            <span aria-hidden="true"> · </span>
            <time dateTime={post.createdAt.toISOString()}>{when(post.createdAt)}</time>
          </p>
        </div>
      </header>
      <div className="wr-prose max-w-[68ch]" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
    </article>
  );
}

/** One out-of-character message: plain, compact and visibly not part of the story. */
export function OocMessage({ post }: { post: Post }) {
  return (
    <li className="text-sm">
      <p className="text-xs text-ink-muted">
        <span className="font-medium text-ink">{post.authorName ?? 'Former member'}</span>
        <span aria-hidden="true"> · </span>
        <time dateTime={post.createdAt.toISOString()}>{when(post.createdAt)}</time>
      </p>
      <p className="mt-0.5 whitespace-pre-line text-ink">{post.contentText}</p>
    </li>
  );
}
