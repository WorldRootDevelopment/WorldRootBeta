'use client';

import { Button, TextArea, TextField } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type CSSProperties, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';
import { FormFooter } from '@/features/shell/form-footer';

interface ProfileFormProps {
  handle: string;
  displayName: string;
  pronouns: string | null;
  bio: string | null;
  hideOnline: boolean;
  status: string | null;
  accentHue: number | null;
}

/** Edit your own profile and how you appear to others. */
export function ProfileForm({ handle, displayName, pronouns, bio, hideOnline, status, accentHue }: ProfileFormProps) {
  const router = useRouter();
  // No colour of your own means WorldRoot's.
  const [ownColour, setOwnColour] = useState(accentHue !== null);
  const [hue, setHue] = useState(accentHue ?? 62);
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
      status: form.get('status'),
      accentHue: ownColour ? hue : null,
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
        label="Status"
        name="status"
        defaultValue={status ?? ''}
        error={fields.status}
        maxLength={80}
        hint="Optional. A short line under your name: what you are up to, or a favourite quote."
      />
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

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-ink">Profile colour</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
          <input type="checkbox" checked={ownColour} onChange={(event) => setOwnColour(event.target.checked)} className="size-5 shrink-0 accent-accent" />
          Give my profile its own colour
        </label>
        {ownColour ? (
          <div className="wr-accent-scope flex flex-wrap items-center gap-4" style={{ '--wr-accent-hue': hue } as CSSProperties}>
            <label htmlFor="profile-hue" className="sr-only">
              Colour
            </label>
            <input
              id="profile-hue"
              type="range"
              min={0}
              max={359}
              value={hue}
              onChange={(event) => setHue(Number(event.target.value))}
              className="h-3 w-64 max-w-full cursor-pointer appearance-none rounded-full"
              style={{ background: 'linear-gradient(90deg in oklch longer hue, oklch(0.72 0.1 0), oklch(0.72 0.1 359))' }}
            />
            <span className="wr-gloss inline-flex min-h-9 items-center rounded-full px-4 text-sm font-medium">Like this</span>
            <span className="inline-flex min-h-9 items-center rounded-full bg-accent-soft px-4 text-sm font-medium text-accent-text">and this</span>
          </div>
        ) : null}
        {fields.accentHue ? (
          <p role="alert" className="text-sm text-danger">
            {fields.accentHue}
          </p>
        ) : null}
      </fieldset>

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
