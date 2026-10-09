import type { PresenceRow } from '@worldroot/core';
import Link from 'next/link';
import { Badges } from '@/features/identity/badges';
import { Picture } from '@/features/shell/picture';

function MemberList({ title, members }: { title: string; members: PresenceRow[] }) {
  if (members.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {title} — {members.length}
      </h3>
      <ul className="flex flex-col gap-1">
        {members.map((member) => (
          <li key={member.userId} className={`flex items-center gap-2.5 rounded-lg px-1.5 py-1 ${member.online ? '' : 'opacity-60'}`}>
            <span className="relative">
              <Picture mediaId={member.avatarId} name={member.displayName} className="size-9 text-sm" />
              {/* The dot repeats what the section heading already says, so status never rests on colour alone. */}
              <span
                aria-hidden="true"
                className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-surface-raised ${member.online ? 'bg-online' : 'bg-line-strong'}`}
              />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <Link href={`/u/${member.handle}`} className="truncate rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                  {member.displayName}
                </Link>
                <Badges list={member.badges} community={member.communityBadge} compact />
              </span>
              {member.role ? <span className="block truncate text-xs text-ink-muted">{member.role}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A community's members, on every page of the community: who is here now, then
 * everyone else. Beside the page on a wide screen; folded above it on a narrow one.
 */
export function MemberRail({ members }: { members: PresenceRow[] }) {
  const online = members.filter((member) => member.online);
  const offline = members.filter((member) => !member.online);
  const lists = (
    <div className="flex flex-col gap-5">
      <MemberList title="Online" members={online} />
      <MemberList title="Offline" members={offline} />
    </div>
  );

  return (
    <>
      <details className="wr-glass mb-6 rounded-2xl xl:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 text-sm font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-online" />
          {online.length} online
          <span className="font-normal text-ink-muted">
            · {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </summary>
        <div className="max-h-72 overflow-y-auto border-t border-line p-4">{lists}</div>
      </details>

      <aside aria-label="Members" className="wr-glass sticky top-4 order-last hidden max-h-[calc(100dvh-2rem)] w-60 shrink-0 self-start overflow-y-auto rounded-2xl p-4 xl:block">
        <h2 className="mb-4 font-display text-sm font-semibold text-ink">Members</h2>
        {lists}
      </aside>
    </>
  );
}
