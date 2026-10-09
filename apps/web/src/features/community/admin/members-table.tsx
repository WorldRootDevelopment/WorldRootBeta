'use client';

import type { BanRow, MemberRow } from '@worldroot/core';
import { Button } from '@worldroot/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badges } from '@/features/identity/badges';
import { send } from '@/features/scenes/api';

interface MembersTableProps {
  communityId: string;
  members: MemberRow[];
  /** Roles the viewer may hand out or take away: those below their own rank, without the built-in Member role. */
  assignable: Array<{ id: string; name: string }>;
  viewerId: string;
  /** The viewer's rank. Members at or above it cannot be removed. */
  viewerTop: number;
  canAssign: boolean;
  canRemove: boolean;
  canBan: boolean;
  bans: BanRow[];
}

export function MembersTable({ communityId, members, assignable, viewerId, viewerTop, canAssign, canRemove, canBan, bans }: MembersTableProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assignableIds = new Set(assignable.map((role) => role.id));

  const act = async (key: string, method: 'PUT' | 'POST' | 'DELETE', url: string, body?: unknown) => {
    setBusy(key);
    const result = await send(method, url, body);
    setBusy(null);
    setError(result.ok ? null : result.message);
    if (result.ok) router.refresh();
  };

  const base = `/api/v1/communities/${communityId}/members`;

  return (
    <>
      {error ? (
        <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {members.map((member) => {
          const rank = Math.max(-1, ...member.roles.map((role) => role.position));
          const held = new Set(member.roles.map((role) => role.id));
          const addable = assignable.filter((role) => !held.has(role.id));
          const outranked = member.userId !== viewerId && rank < viewerTop;
          const removable = canRemove && outranked;
          const bannable = canBan && outranked;

          return (
            <li key={member.userId} className="wr-glass rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="min-w-0">
                  <Link href={`/u/${member.handle}`} className="font-medium text-ink rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                    {member.displayName}
                  </Link>{' '}
                  <span className="text-sm text-ink-muted">@{member.handle}</span>{' '}
                  <Badges list={member.badges} community={member.communityBadge} />
                  {member.userId === viewerId ? <span className="ml-2 text-xs text-ink-muted">(You)</span> : null}
                </p>
                <div className="flex flex-wrap gap-1">
                {bannable ? (
                  <Button
                    variant="ghost"
                    disabled={busy !== null}
                    onClick={() => {
                      const reason = window.prompt(
                        `Ban ${member.displayName}? They are removed and cannot rejoin, even with an invite link. Their characters and posts stay.\n\nReason (optional, seen by staff only):`,
                        '',
                      );
                      if (reason !== null) {
                        void act(`ban-${member.userId}`, 'POST', `/api/v1/communities/${communityId}/bans`, { userId: member.userId, reason });
                      }
                    }}
                  >
                    Ban
                  </Button>
                ) : null}
                {removable ? (
                  <Button
                    variant="ghost"
                    disabled={busy !== null}
                    onClick={() => {
                      if (window.confirm(`Remove ${member.displayName} from the community? They can rejoin. Their characters and posts stay.`)) {
                        void act(`remove-${member.userId}`, 'DELETE', `${base}/${member.userId}`);
                      }
                    }}
                  >
                    Remove Member
                  </Button>
                ) : null}
                </div>
              </div>

              <ul className="mt-3 flex flex-wrap items-center gap-2">
                {member.roles.map((role) => (
                  <li key={role.id} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line bg-surface px-3 text-sm text-ink">
                    {role.name}
                    {canAssign && assignableIds.has(role.id) ? (
                      <button
                        type="button"
                        aria-label={`Remove The ${role.name} Role From ${member.displayName}`}
                        disabled={busy !== null}
                        onClick={() => act(`unassign-${member.userId}-${role.id}`, 'DELETE', `${base}/${member.userId}/roles/${role.id}`)}
                        className="-mr-1.5 flex size-6 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    ) : null}
                  </li>
                ))}
                {canAssign && addable.length > 0 ? (
                  <li>
                    <label className="sr-only" htmlFor={`add-role-${member.userId}`}>
                      Give {member.displayName} A Role
                    </label>
                    <select
                      id={`add-role-${member.userId}`}
                      value=""
                      disabled={busy !== null}
                      onChange={(event) => {
                        if (event.target.value) void act(`assign-${member.userId}`, 'PUT', `${base}/${member.userId}/roles/${event.target.value}`);
                      }}
                      className="min-h-8 rounded-full border border-dashed border-line-strong bg-surface-raised px-3 text-sm text-ink-muted focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      <option value="">Add Role…</option>
                      {addable.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </li>
                ) : null}
              </ul>
            </li>
          );
        })}
      </ul>

      {canBan && bans.length > 0 ? (
        <section className="mt-12">
          <h3 className="mb-4 font-display text-xl font-semibold text-ink">Banned</h3>
          <ul className="flex flex-col gap-3">
            {bans.map((ban) => (
              <li key={ban.userId} className="flex flex-wrap items-center justify-between gap-3 wr-glass rounded-2xl p-5">
                <p className="min-w-0 text-sm">
                  <span className="font-medium text-ink">{ban.displayName ?? 'Former User'}</span>
                  {ban.handle ? <span className="text-ink-muted"> @{ban.handle}</span> : null}
                  <span className="block text-ink-muted">
                    Banned {ban.createdAt.toLocaleDateString('en', { dateStyle: 'medium' })}
                    {ban.reason ? ` · ${ban.reason}` : ''}
                  </span>
                </p>
                <Button
                  variant="secondary"
                  disabled={busy !== null}
                  onClick={() => act(`unban-${ban.userId}`, 'DELETE', `/api/v1/communities/${communityId}/bans/${ban.userId}`)}
                >
                  Lift Ban
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
