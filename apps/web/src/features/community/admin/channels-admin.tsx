'use client';

import { Button, TextField } from '@worldroot/ui';
import { ArrowDown, ArrowUp, Hash, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';

export interface AdminChannel {
  id: string;
  name: string;
  topic: string | null;
  category: string | null;
  readRoleIds: string[] | null;
  postRoleIds: string[] | null;
}

interface RoleOption {
  id: string;
  name: string;
}

/** Tick boxes for narrowing a channel to some roles. None ticked means no narrowing. */
function RolePicker({ legend, hint, name, roles, chosen }: { legend: string; hint: string; name: string; roles: RoleOption[]; chosen: string[] | null }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">{legend}</legend>
      <p className="mb-1 text-sm text-ink-muted">{hint}</p>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {roles.map((role) => (
          <label key={role.id} className="flex min-h-11 items-center gap-2 text-sm text-ink">
            <input type="checkbox" name={name} value={role.id} defaultChecked={chosen?.includes(role.id) ?? false} className="size-5 shrink-0 accent-accent" />
            {role.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface ChannelFormProps {
  communityId: string;
  roles: RoleOption[];
  /** The channel being changed. Absent when adding one. */
  channel?: AdminChannel;
  onDone?: () => void;
}

/** Add a channel, or change one: its name, what it is for, the heading it sits under, and who may use it. */
function ChannelForm({ communityId, roles, channel, onDone }: ChannelFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setPending(true);
    const body = { name: form.get('name'), topic: form.get('topic'), category: form.get('category'), readRoleIds: form.getAll('readRoleIds'), postRoleIds: form.getAll('postRoleIds') };
    const result = channel ? await send('PATCH', `/api/v1/channels/${channel.id}`, body) : await send('POST', `/api/v1/communities/${communityId}/channels`, body);
    setPending(false);
    setFields(result.fields);
    setError(result.ok ? null : Object.keys(result.fields).length > 0 ? 'Check the highlighted fields.' : result.message);
    if (!result.ok) return;
    if (!channel) element.reset();
    onDone?.();
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Name" name="name" defaultValue={channel?.name ?? ''} error={fields.name} maxLength={32} required hint="Lower-case letters, numbers and hyphens." />
        <TextField label="Heading" name="category" defaultValue={channel?.category ?? ''} error={fields.category} maxLength={40} hint="Optional. Channels with the same heading are listed together." />
      </div>
      <TextField label="Topic" name="topic" defaultValue={channel?.topic ?? ''} error={fields.topic} maxLength={200} hint="Optional. A line saying what the channel is for." />
      <RolePicker
        legend="Who Can See It"
        hint="Leave all unticked for everyone who can see the community. Tick roles to make it private to them. Whoever manages the community can always see it."
        name="readRoleIds"
        roles={roles}
        chosen={channel?.readRoleIds ?? null}
      />
      <RolePicker
        legend="Who Can Post"
        hint="Leave all unticked for everyone allowed to post in channels. Tick roles for a channel only they write in, such as a rules or news channel."
        name="postRoleIds"
        roles={roles}
        chosen={channel?.postRoleIds ?? null}
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : channel ? 'Save Channel' : 'Add Channel'}
        </Button>
        {channel && onDone ? (
          <Button variant="ghost" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

interface ChannelsAdminProps {
  communityId: string;
  channels: AdminChannel[];
  roles: RoleOption[];
}

/** A community's chat channels, for the people who manage it: add, change, reorder and delete. */
export function ChannelsAdmin({ communityId, channels, roles }: ChannelsAdminProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (method: 'PATCH' | 'DELETE', id: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    const result = await send(method, `/api/v1/channels/${id}`, body);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    router.refresh();
  };
  const remove = (channel: AdminChannel) => {
    if (!window.confirm(`Delete #${channel.name} and every message in it? This cannot be undone.`)) return;
    void act('DELETE', channel.id);
  };
  const iconButton = 'flex size-11 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <ul className="flex flex-col gap-3">
        {channels.map((channel, index) => (
          <li key={channel.id} className="wr-glass rounded-2xl p-4">
            {editing === channel.id ? (
              <ChannelForm communityId={communityId} roles={roles} channel={channel} onDone={() => setEditing(null)} />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {channel.readRoleIds ? <Lock className="size-5 shrink-0 text-ink-muted" aria-hidden="true" /> : <Hash className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">
                    {channel.name}
                    {channel.category ? <span className="ml-2 text-xs font-normal uppercase tracking-wide text-ink-muted">{channel.category}</span> : null}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {channel.topic ?? 'No topic.'}
                    {channel.readRoleIds ? ' · Private To Some Roles' : ''}
                    {channel.postRoleIds ? ' · Only Some Roles Post' : ''}
                  </p>
                </div>
                <button type="button" className={iconButton} disabled={busy || index === 0} onClick={() => act('PATCH', channel.id, { move: 'up' })}>
                  <ArrowUp className="size-4" aria-hidden="true" />
                  <span className="sr-only">Move #{channel.name} Up</span>
                </button>
                <button type="button" className={iconButton} disabled={busy || index === channels.length - 1} onClick={() => act('PATCH', channel.id, { move: 'down' })}>
                  <ArrowDown className="size-4" aria-hidden="true" />
                  <span className="sr-only">Move #{channel.name} Down</span>
                </button>
                <Button variant="secondary" onClick={() => setEditing(channel.id)} disabled={busy}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => remove(channel)} disabled={busy || channels.length <= 1}>
                  Delete
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section>
        <h3 className="mb-4 font-display text-xl font-semibold text-ink">Add A Channel</h3>
        <ChannelForm communityId={communityId} roles={roles} />
      </section>
    </div>
  );
}
