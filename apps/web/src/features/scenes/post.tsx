import type { PostPage } from '@worldroot/core';
import type { RichDoc } from '@worldroot/editor';
import { Dices } from 'lucide-react';
import Link from 'next/link';
import { CharacterAvatar } from '@/features/characters/character-card';
import { Badges } from '@/features/identity/badges';
import { ReportButton } from '@/features/moderation/report-client';
import { PostBody, RemovePostButton } from './post-body';

type Post = PostPage['posts'][number];

const when = (date: Date) => date.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });

const removedLine = (post: Post, what: string) =>
  post.removedBy === 'author' ? `This ${what} was removed by its author.` : `This ${what} was removed by a moderator.`;

interface StoryPostProps {
  post: Post;
  /** The viewer may remove other people's posts in this scene. */
  canModerate: boolean;
  /** False once the scene is archived. */
  editable: boolean;
}

/** One in-character post. The character leads; the writer is credited quietly. */
export function StoryPost({ post, canModerate, editable }: StoryPostProps) {
  if (post.removedBy) {
    // A removed post keeps its place so the scene around it still reads in order.
    return (
      <article id={`post-${post.seq}`} className="scroll-mt-24 rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-ink-muted">
        {removedLine(post, 'post')}
      </article>
    );
  }

  if (post.kind === 'system') {
    // A note from WorldRoot itself, such as a dice roll. It has no author controls: nobody can edit it.
    return (
      <article id={`post-${post.seq}`} className="flex scroll-mt-24 items-start gap-3 rounded-xl bg-surface-sunken px-4 py-3 text-sm text-ink">
        <Dices className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden="true" />
        <div className="min-w-0">
          <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
          <p className="mt-1 text-xs text-ink-muted">
            {post.authorHandle ? `Rolled by @${post.authorHandle}` : 'Rolled by a former member'} · <time dateTime={post.createdAt.toISOString()}>{when(post.createdAt)}</time>
          </p>
        </div>
      </article>
    );
  }

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
            {post.authorHandle ? (
              <>
                Written by{' '}
                <Link href={`/u/${post.authorHandle}`} className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                  @{post.authorHandle}
                </Link>
              </>
            ) : (
              'Written by a former member'
            )}
            {post.authorBadges.length > 0 ? (
              <>
                {' '}
                <Badges list={post.authorBadges} compact />
              </>
            ) : null}
            <span aria-hidden="true"> · </span>
            <time dateTime={post.createdAt.toISOString()}>{when(post.createdAt)}</time>
            {post.editedAt ? (
              <>
                <span aria-hidden="true"> · </span>
                <span title={`Edited ${when(post.editedAt)}`}>edited</span>
              </>
            ) : null}
          </p>
        </div>
      </header>
      <PostBody
        postId={post.id}
        html={post.contentHtml}
        // The editable document goes only to the person who wrote it.
        doc={post.mine && editable ? (post.contentJson as RichDoc) : null}
        canEdit={post.mine && editable}
        canRemove={post.mine || canModerate}
        canReport={!post.mine}
      />
    </article>
  );
}

/** One out-of-character message: plain, compact and visibly not part of the story. */
export function OocMessage({ post, canModerate }: { post: Post; canModerate: boolean }) {
  if (post.removedBy) return <li className="text-xs italic text-ink-muted">{removedLine(post, 'message')}</li>;
  return (
    <li className="text-sm">
      <div className="flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
        <span className="font-medium text-ink">{post.authorName ?? 'Former member'}</span>
        <Badges list={post.authorBadges} compact />
        <time dateTime={post.createdAt.toISOString()}>{when(post.createdAt)}</time>
        {post.mine || canModerate ? <RemovePostButton postId={post.id} what="message" /> : null}
        {post.mine ? null : <ReportButton targetType="scene_post" targetId={post.id} />}
      </div>
      <p className="mt-0.5 whitespace-pre-line text-ink">{post.contentText}</p>
    </li>
  );
}
