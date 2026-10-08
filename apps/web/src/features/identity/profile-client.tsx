'use client';

import { Button, TextArea, TextField } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';
import { FormFooter } from '@/features/shell/form-footer';

interface ProfileFormProps {
  handle: string;
  displayName: string;
  pronouns: string | null;
  bio: string | null;
  hideOnline: boolean;
}

/** Edit your own profile and how you appear to others. */
export function ProfileForm({ handle, displayName, pronouns, bio, hideOnline }: ProfileFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setSaved(false);
    const result = await send('PATCH', '/api/v1/profile', {
      displayName: form.get('displayName'),
      pronouns: form.get('pronouns'),
      bio: form.get('bio'),
      hideOnline: form.get('hideOnline') === 'on',
    });
    setPending(false);
    setFields(result.fields);
    setError(result.ok ? null : Object.keys(result.fields).length > 0 ? 'Check the highlighted fields.' : result.message);
    if (result.ok) {
      setSaved(true);
      router.refresh();
    }
  };

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-5" noValidate>
      <TextField label="Display name" name="displayName" defaultValue={displayName} error={fields.displayName} maxLength={50} required />
      <TextField
        label="Pronouns"
        name="pronouns"
        defaultValue={pronouns ?? ''}
        error={fields.pronouns}
        maxLength={40}
        hint="Optional. Shown on your profile."
      />
      <TextArea
        label="About you"
        name="bio"
        defaultValue={bio ?? ''}
        error={fields.bio}
        rows={6}
        maxLength={2000}
        hint="Optional. What you like to write, when you are around, what you are looking for in a partner."
      />

      <fieldset className="flex flex-col">
        <legend className="mb-1 text-sm font-medium text-ink">Privacy</legend>
        <label className="flex min-h-11 items-start gap-3 py-2 text-sm text-ink">
          <input type="checkbox" name="hideOnline" defaultChecked={hideOnline} className="mt-0.5 size-5 shrink-0 accent-accent" />
          <span>
            Appear offline
            <span className="block text-ink-muted">You will never be listed as online in a community’s lounge. You can still read and write as usual.</span>
          </span>
        </label>
      </fieldset>

      {saved ? (
        <p role="status" className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-text">
          Saved.
        </p>
      ) : null}
      <FormFooter error={error} pending={pending} submitLabel="Save profile" cancelHref={`/u/${handle}`} />
    </form>
  );
}

/** On someone's profile: open your conversation with them. */
export function MessageButton({ handle }: { handle: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    setPending(true);
    const result = await send<{ conversation: { id: string } }>('POST', '/api/v1/conversations', { handles: handle });
    if (!result.ok || !result.data) {
      setPending(false);
      setError(result.message);
      return;
    }
    router.push(`/inbox/${result.data.conversation.id}`);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={open} disabled={pending}>
        {pending ? 'Opening…' : 'Message'}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
