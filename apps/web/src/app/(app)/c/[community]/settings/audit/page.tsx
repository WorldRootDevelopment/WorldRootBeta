import { listAuditLog } from '@worldroot/core';
import type { Metadata } from 'next';
import { requireSection } from '@/features/community/admin/admin-view';

export const metadata: Metadata = { title: 'Audit Log' };

/** Plain-language names for the action keys written by the services. */
const ACTIONS: Record<string, string> = {
  'community.create': 'Created The Community',
  'community.update': 'Changed Community Settings',
  'community.archive': 'Archived The Community',
  'community.restore': 'Restored The Community',
  'role.create': 'Created A Role',
  'role.update': 'Changed A Role',
  'role.delete': 'Deleted A Role',
  'role.assign': 'Gave A Member A Role',
  'role.unassign': 'Took A Role From A Member',
  'member.remove': 'Removed A Member',
  'member.ban': 'Banned A Member',
  'member.unban': 'Lifted A Ban',
  'invite.create': 'Created An Invite Link',
  'invite.revoke': 'Revoked An Invite Link',
  'characterfield.create': 'Added A Character Field',
  'characterfield.remove': 'Removed A Character Field',
  'character.add': 'Added A Character',
  'character.update': 'Edited A Character',
  'character.approve': 'Approved A Character',
  'character.return': 'Returned A Character',
  'world.add': 'Added A World',
  'world.update': 'Edited A World',
  'location.create': 'Added A Location',
  'location.update': 'Edited A Location',
  'scene.status': 'Changed A Scene’s Status',
  'post.remove': 'Removed A Post',
  'message.remove': 'Removed A Message',
  'report.resolve': 'Resolved A Report',
  'report.dismiss': 'Dismissed A Report',
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
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Audit Log</h2>
      <p className="mb-6 mt-2 max-w-2xl text-ink-muted">
        Every privileged action in this community, newest first. Entries cannot be edited or deleted. Showing the latest {entries.length}.
      </p>
      <ol className="flex flex-col divide-y divide-line wr-glass rounded-2xl">
        {entries.map((entry) => {
          const before = detail(entry.before);
          const after = detail(entry.after);
          return (
            <li key={entry.id} className="px-5 py-4 text-sm">
              <p className="text-ink">
                <span className="font-medium">{entry.actorName ?? 'A Former Member'}</span>
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
