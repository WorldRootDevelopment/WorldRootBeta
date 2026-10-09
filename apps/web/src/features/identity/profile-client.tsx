'use client';

import type { ProfileTheme } from '@worldroot/contracts';
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
  theme: ProfileTheme | null;
}

/** Starting points for a profile background. Any two colors can be chosen after picking one. */
const BACKGROUNDS: Array<{ name: string; from: string; to: string }> = [
  { name: 'Sunrise', from: '#ff9a6b', to: '#ffd36b' },
  { name: 'Orchid', from: '#b06bff', to: '#ff7ac8' },
  { name: 'Lagoon', from: '#2bd4c4', to: '#4f8dff' },
  { name: 'Meadow', from: '#7bd66b', to: '#e8e06b' },
  { name: 'Ember', from: '#ff5a4f', to: '#7a2bd4' },
  { name: 'Midnight', from: '#2b3a8f', to: '#12122b' },
  { name: 'Rosewood', from: '#8f2b4f', to: '#ffb199' },
  { name: 'Frost', from: '#bfe9ff', to: '#e6d9ff' },
];

/** Edit your own profile and how you appear to others. */
export function ProfileForm({ handle, displayName, pronouns, bio, hideOnline, status, accentHue, theme }: ProfileFormProps) {
  const router = useRouter();
  // No color of your own means WorldRoot's.
  const [ownColor, setOwnColor] = useState(accentHue !== null);
  const [hue, setHue] = useState(accentHue ?? 62);
  const [ownBackground, setOwnBackground] = useState(theme !== null);
  const [background, setBackground] = useState<ProfileTheme>(theme ?? { from: BACKGROUNDS[0]!.from, to: BACKGROUNDS[0]!.to, angle: 135 });
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
      accentHue: ownColor ? hue : null,
      theme: ownBackground ? background : null,
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
      <TextField label="Display Name" name="displayName" defaultValue={displayName} error={fields.displayName} maxLength={50} required />
      <TextField
        label="Status"
        name="status"
        defaultValue={status ?? ''}
        error={fields.status}
        maxLength={80}
        hint="Optional. A short line under your name: what you are up to, or a favorite quote."
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
        label="About You"
        name="bio"
        defaultValue={bio ?? ''}
        error={fields.bio}
        rows={6}
        maxLength={2000}
        hint="Optional. What you like to write, when you are around, what you are looking for in a partner."
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-ink">Profile Color</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
          <input type="checkbox" checked={ownColor} onChange={(event) => setOwnColor(event.target.checked)} className="size-5 shrink-0 accent-accent" />
          Give my profile its own color
        </label>
        {ownColor ? (
          <div className="wr-accent-scope flex flex-wrap items-center gap-4" style={{ '--wr-accent-hue': hue } as CSSProperties}>
            <label htmlFor="profile-hue" className="sr-only">
              Color
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

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium text-ink">Profile Background</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
          <input type="checkbox" checked={ownBackground} onChange={(event) => setOwnBackground(event.target.checked)} className="size-5 shrink-0 accent-accent" />
          Give my profile a two-color background
        </label>
        {ownBackground ? (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-wrap gap-2">
              {BACKGROUNDS.map((preset) => {
                const chosen = preset.from === background.from && preset.to === background.to;
                return (
                  <li key={preset.name}>
                    <button
                      type="button"
                      aria-pressed={chosen}
                      onClick={() => setBackground((current) => ({ ...current, from: preset.from, to: preset.to }))}
                      className={`flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${chosen ? 'border-accent bg-accent-soft font-medium' : 'border-line hover:bg-surface-sunken'}`}
                    >
                      <span aria-hidden="true" className="size-5 rounded-full" style={{ backgroundImage: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }} />
                      {preset.name}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink">
              <label className="flex items-center gap-2">
                First Color
                <input type="color" value={background.from} onChange={(event) => setBackground((current) => ({ ...current, from: event.target.value }))} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-transparent p-1" />
              </label>
              <label className="flex items-center gap-2">
                Second Color
                <input type="color" value={background.to} onChange={(event) => setBackground((current) => ({ ...current, to: event.target.value }))} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-transparent p-1" />
              </label>
              <label className="flex items-center gap-2">
                Direction
                <input type="range" min={0} max={360} step={5} value={background.angle} onChange={(event) => setBackground((current) => ({ ...current, angle: Number(event.target.value) }))} className="w-40 cursor-pointer accent-accent" />
              </label>
            </div>
            {/* A small copy of how the top of the profile will look. */}
            <div
              aria-hidden="true"
              className="wr-profile-theme max-w-md overflow-hidden rounded-2xl"
              style={{ '--wr-pt-from': background.from, '--wr-pt-to': background.to, '--wr-pt-angle': background.angle } as CSSProperties}
            >
              <div className="wr-profile-theme-band h-16" />
              <div className="px-4 pb-4 pt-3">
                <p className="font-display text-lg font-bold text-ink">{displayName}</p>
                <p className="text-sm text-ink-muted">@{handle} · how your profile will look</p>
              </div>
            </div>
          </div>
        ) : null}
        {fields.theme ? (
          <p role="alert" className="text-sm text-danger">
            {fields.theme}
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
      <FormFooter error={error} pending={pending} submitLabel="Save Profile" cancelHref={`/u/${handle}`} />
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
