'use client';

import { PERMISSION_GROUPS, PERMISSIONS, type PermissionKey } from '@worldroot/contracts';
import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { send } from '@/features/scenes/api';

export interface EditableRole {
  id: string;
  name: string;
  permissions: PermissionKey[];
  isOwner: boolean;
  isDefault: boolean;
  /** False for roles at or above the viewer's own rank. */
  editable: boolean;
}

const inputClass =
  'min-h-11 w-full rounded-lg border border-line-strong bg-surface-raised px-3 text-base text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:opacity-60';

const keysByGroup = PERMISSION_GROUPS.map((group) => ({
  group,
  keys: (Object.keys(PERMISSIONS) as PermissionKey[]).filter((key) => PERMISSIONS[key].group === group),
}));

interface PermissionMatrixProps {
  idPrefix: string;
  value: PermissionKey[];
  onChange: (next: PermissionKey[]) => void;
  disabled: boolean;
  /** Permissions the viewer may grant. Others are shown but locked. */
  grantable: PermissionKey[];
}

/** Every permission, grouped, each with its plain-language description. Generated from the registry. */
function PermissionMatrix({ idPrefix, value, onChange, disabled, grantable }: PermissionMatrixProps) {
  return (
    <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {keysByGroup.map(({ group, keys }) => (
        <fieldset key={group}>
          <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">{group}</legend>
          {keys.map((key) => {
            const held = value.includes(key);
            // A permission the viewer cannot grant can still be taken away from a role.
            const locked = disabled || (!held && !grantable.includes(key));
            return (
              <label key={key} className="flex min-h-11 items-start gap-3 py-1.5 text-sm text-ink">
                <input
                  id={`${idPrefix}-${key}`}
                  type="checkbox"
                  checked={held}
                  disabled={locked}
                  onChange={(event) => onChange(event.target.checked ? [...value, key] : value.filter((other) => other !== key))}
                  className="mt-0.5 size-5 shrink-0 accent-accent"
                />
                <span className={locked && !held ? 'opacity-60' : undefined}>
                  {PERMISSIONS[key].label}
                  <span className="block text-ink-muted">{PERMISSIONS[key].description}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}

function RoleCard({ role, grantable }: { role: EditableRole; grantable: PermissionKey[] }) {
  const router = useRouter();
  const [name, setName] = useState(role.name);
  const [permissions, setPermissions] = useState(role.permissions);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = name !== role.name || permissions.length !== role.permissions.length || permissions.some((key) => !role.permissions.includes(key));

  const save = async () => {
    setPending(true);
    const result = await send('PATCH', `/api/v1/roles/${role.id}`, { name, permissions });
    setPending(false);
    setMessage(result.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: result.fields.name ?? result.message ?? 'Could not save.' });
    if (result.ok) router.refresh();
  };

  const remove = async () => {
    if (!window.confirm(`Delete the ${role.name} role? Everyone who holds it will lose it.`)) return;
    setPending(true);
    const result = await send('DELETE', `/api/v1/roles/${role.id}`);
    setPending(false);
    if (!result.ok) setMessage({ ok: false, text: result.message ?? 'Could not delete.' });
    else router.refresh();
  };

  const note = role.isOwner
    ? 'Holds every permission. This role cannot be changed.'
    : role.isDefault
      ? 'Given to everyone when they join. Its permissions are what every member can do.'
      : !role.editable
        ? 'This role is at or above your own, so you cannot change it.'
        : null;

  return (
    <details className="group wr-glass rounded-2xl">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
        <span className="font-display text-lg font-semibold text-ink">{role.name}</span>
        <span className="text-sm text-ink-muted">
          {role.isOwner ? 'All Permissions' : `${role.permissions.length} ${role.permissions.length === 1 ? 'permission' : 'permissions'}`}
          <span aria-hidden="true" className="ml-3 inline-block transition-transform group-open:rotate-90">
            ›
          </span>
        </span>
      </summary>

      <div className="flex flex-col gap-5 border-t border-line p-5">
        {note ? <p className="text-sm text-ink-muted">{note}</p> : null}
        {role.isOwner ? null : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`name-${role.id}`} className="text-sm font-medium text-ink">
                Role Name
              </label>
              <input
                id={`name-${role.id}`}
                value={name}
                maxLength={40}
                disabled={!role.editable || role.isDefault}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
              />
            </div>
            <PermissionMatrix idPrefix={role.id} value={permissions} onChange={setPermissions} disabled={!role.editable} grantable={grantable} />
            {message ? (
              <p role={message.ok ? 'status' : 'alert'} className={`text-sm ${message.ok ? 'text-accent-text' : 'text-danger'}`}>
                {message.text}
              </p>
            ) : null}
            {role.editable ? (
              <div className="flex flex-wrap gap-3">
                <Button onClick={save} disabled={pending || !dirty}>
                  {pending ? 'Saving…' : 'Save Role'}
                </Button>
                {role.isDefault ? null : (
                  <Button variant="ghost" onClick={remove} disabled={pending}>
                    Delete Role
                  </Button>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </details>
  );
}

function NewRole({ communityId, grantable }: { communityId: string; grantable: PermissionKey[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setPending(true);
    const result = await send('POST', `/api/v1/communities/${communityId}/roles`, { name, permissions });
    setPending(false);
    if (!result.ok) return setError(result.fields.name ?? result.message);
    setName('');
    setPermissions([]);
    setError(null);
    router.refresh();
  };

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-dashed border-line-strong p-5">
      <h3 className="font-display text-lg font-semibold text-ink">New Role</h3>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-role-name" className="text-sm font-medium text-ink">
          Role Name
        </label>
        <input id="new-role-name" value={name} maxLength={40} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="World Manager" />
      </div>
      <PermissionMatrix idPrefix="new-role" value={permissions} onChange={setPermissions} disabled={false} grantable={grantable} />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button onClick={create} disabled={pending || !name.trim()} className="self-start">
        {pending ? 'Creating…' : 'Create Role'}
      </Button>
    </section>
  );
}

interface RolesEditorProps {
  communityId: string;
  roles: EditableRole[];
  /** What the viewer may hand out: everything for an owner, otherwise what they hold. */
  grantable: PermissionKey[];
}

export function RolesEditor({ communityId, roles, grantable }: RolesEditorProps) {
  return (
    <div className="flex flex-col gap-4">
      {roles.map((role) => (
        // Keyed on the saved state so a card resets after its role is saved.
        <RoleCard key={`${role.id}-${role.name}-${role.permissions.join(',')}`} role={role} grantable={grantable} />
      ))}
      <NewRole communityId={communityId} grantable={grantable} />
    </div>
  );
}
