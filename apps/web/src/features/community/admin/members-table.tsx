'use client';

import type { MemberRow } from '@worldroot/core';
import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
}

export function MembersTable({ communityId, members, assignable, viewerId, viewerTop, canAssign, canRemove }: MembersTableProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assignableIds = new Set(assignable.map((role) => role.id));

  const act = async (key: string, method: 'PUT' | 'DELETE', url: string) => {
    setBusy(key);
    const result = await send(method, url);
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
          const removable = canRemove && member.userId !== viewerId && rank < viewerTop;

          return (
            <li key={member.userId} className="rounded-2xl border border-line bg-surface-raised p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="min-w-0">
                  <span className="font-medium text-ink">{member.displayName}</span> <span className="text-sm text-ink-muted">@{member.handle}</span>
                  {member.userId === viewerId ? <span className="ml-2 text-xs text-ink-muted">(you)</span> : null}
                </p>
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
                    Remove member
                  </Button>
                ) : null}
              </div>

              <ul className="mt-3 flex flex-wrap items-center gap-2">
                {member.roles.map((role) => (
                  <li key={role.id} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line bg-surface px-3 text-sm text-ink">
                    {role.name}
                    {canAssign && assignableIds.has(role.id) ? (
                      <button
                        type="button"
                        aria-label={`Remove the ${role.name} role from ${member.displayName}`}
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
                      Give {member.displayName} a role
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
                      <option value="">Add role…</option>
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
    </>
  );
}
