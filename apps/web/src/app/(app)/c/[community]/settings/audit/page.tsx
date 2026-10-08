import { listAuditLog } from '@worldroot/core';
import type { Metadata } from 'next';
import { requireSection } from '@/features/community/admin/admin-view';

export const metadata: Metadata = { title: 'Audit log' };

/** Plain-language names for the action keys written by the services. */
const ACTIONS: Record<string, string> = {
  'community.create': 'Created the community',
  'community.update': 'Changed community settings',
  'role.create': 'Created a role',
  'role.update': 'Changed a role',
  'role.delete': 'Deleted a role',
  'role.assign': 'Gave a member a role',
  'role.unassign': 'Took a role from a member',
  'member.remove': 'Removed a member',
  'member.ban': 'Banned a member',
  'member.unban': 'Lifted a ban',
  'invite.create': 'Created an invite link',
  'invite.revoke': 'Revoked an invite link',
  'characterfield.create': 'Added a character field',
  'characterfield.remove': 'Removed a character field',
  'character.add': 'Added a character',
  'character.update': 'Edited a character',
  'character.approve': 'Approved a character',
  'character.return': 'Returned a character',
  'world.add': 'Added a world',
  'world.update': 'Edited a world',
  'scene.status': 'Changed a scene’s status',
  'post.remove': 'Removed a post',
  'message.remove': 'Removed a message',
};

/** A short readable summary of what an entry recorded. */
function detail(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join(', ') || 'none' : String(item ?? 'none')}`)
    .join(' · ');
}

export default async function AuditLogPage({ params }: { params: Promise<{ community: string }> }) {
  const { community, viewer, db } = await requireSection((await params).community, ['auditlog.view']);
  const entries = await listAuditLog(db, viewer.actor, community.id);

  return (
    <>
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">Audit log</h2>
      <p className="mb-6 mt-2 max-w-2xl text-ink-muted">
        Every privileged action in this community, newest first. Entries cannot be edited or deleted. Showing the latest {entries.length}.
      </p>
      <ol className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface-raised">
        {entries.map((entry) => {
          const before = detail(entry.before);
          const after = detail(entry.after);
          return (
            <li key={entry.id} className="px-5 py-4 text-sm">
              <p className="text-ink">
                <span className="font-medium">{entry.actorName ?? 'A former member'}</span>
                {entry.actorHandle ? <span className="text-ink-muted"> @{entry.actorHandle}</span> : null}
                <span aria-hidden="true"> · </span>
                {ACTIONS[entry.action] ?? entry.action}
              </p>
              {before ? <p className="mt-1 break-words text-ink-muted">Before: {before}</p> : null}
              {after ? <p className="mt-1 break-words text-ink-muted">{before ? 'After' : 'Details'}: {after}</p> : null}
              <time dateTime={entry.createdAt.toISOString()} className="mt-1 block text-xs text-ink-muted">
                {entry.createdAt.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
              </time>
            </li>
          );
        })}
      </ol>
    </>
  );
}
