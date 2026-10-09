'use client';

import { TextArea, TextField } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type CSSProperties, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';
import { FormFooter } from '@/features/shell/form-footer';

interface SettingsValues {
  name: string;
  tagline: string | null;
  description: string | null;
  rules: string | null;
  accentHue: number;
  listed: boolean;
  requireCharacterApproval: boolean;
  dndMode: boolean;
}

interface SettingsFormProps {
  /** Present when editing an existing community. Absent when creating one. */
  community?: SettingsValues & { id: string; slug: string };
}

const checkRow = 'flex min-h-11 items-start gap-3 py-2 text-sm text-ink';

/** Create a community, or edit one's details. The same fields serve both. */
export function CommunitySettingsForm({ community }: SettingsFormProps) {
  const router = useRouter();
  const [hue, setHue] = useState(community?.accentHue ?? 155);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      name: form.get('name'),
      tagline: form.get('tagline'),
      description: form.get('description'),
      accentHue: hue,
      listed: form.get('listed') === 'on',
      ...(community
        ? { rules: form.get('rules'), requireCharacterApproval: form.get('requireCharacterApproval') === 'on', dndMode: form.get('dndMode') === 'on' }
        : { slug: form.get('slug') }),
    };
    setPending(true);
    setError(null);
    setFields({});
    setSaved(false);
    const result = await send<{ community: { slug: string } }>(
      community ? 'PATCH' : 'POST',
      community ? `/api/v1/communities/${community.id}` : '/api/v1/communities',
      body,
    );
    setPending(false);
    if (!result.ok || !result.data) {
      setFields(result.fields);
      setError(Object.keys(result.fields).length > 0 ? 'Check the highlighted fields.' : result.message);
      return;
    }
    if (community) {
      setSaved(true);
      router.refresh();
    } else {
      router.push(`/c/${result.data.community.slug}`);
      router.refresh();
    }
  };

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-5" noValidate>
      <TextField label="Name" name="name" defaultValue={community?.name ?? ''} error={fields.name} maxLength={80} required autoFocus={!community} />
      {community ? null : (
        <TextField
          label="Address"
          name="slug"
          error={fields.slug}
          maxLength={40}
          autoCapitalize="none"
          spellCheck={false}
          hint="Lowercase letters, numbers and hyphens. It appears in the community’s link and cannot be changed later."
          required
        />
      )}
      <TextField
        label="Tagline"
        name="tagline"
        defaultValue={community?.tagline ?? ''}
        error={fields.tagline}
        maxLength={160}
        hint="One line, shown under the name."
      />
      <TextArea
        label="About"
        name="description"
        defaultValue={community?.description ?? ''}
        error={fields.description}
        rows={6}
        hint="What you write here, who it is for, and how to get started."
      />
      {community ? (
        <TextArea label="Rules" name="rules" defaultValue={community.rules ?? ''} error={fields.rules} rows={6} hint="Shown on the community’s overview." />
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="accentHue" className="text-sm font-medium text-ink">
          Accent Color
        </label>
        <div className="wr-accent-scope flex items-center gap-4" style={{ '--wr-accent-hue': hue } as CSSProperties}>
          <input
            id="accentHue"
            type="range"
            min={0}
            max={359}
            value={hue}
            onChange={(event) => setHue(Number(event.target.value))}
            className="h-11 flex-1 accent-accent"
          />
          {/* A live sample of how the color will look on buttons and highlights. */}
          <span className="wr-gloss inline-flex min-h-9 items-center rounded-full px-3 text-sm font-medium">Button</span>
          <span className="inline-flex min-h-9 items-center rounded-lg bg-accent-soft px-3 text-sm font-medium text-accent-text">Highlight</span>
        </div>
        <p className="text-sm text-ink-muted">You choose the hue. WorldRoot sets the shades so text stays readable in light and dark.</p>
      </div>

      <fieldset className="flex flex-col">
        <legend className="mb-1 text-sm font-medium text-ink">Access</legend>
        <label className={checkRow}>
          <input type="checkbox" name="listed" defaultChecked={community?.listed ?? false} className="mt-0.5 size-5 shrink-0 accent-accent" />
          <span>
            List This Community
            <span className="block text-ink-muted">Anyone on WorldRoot can find it, read it and join. Unlisted communities are seen only by members.</span>
          </span>
        </label>
        {community ? (
          <label className={checkRow}>
            <input
              type="checkbox"
              name="requireCharacterApproval"
              defaultChecked={community.requireCharacterApproval}
              className="mt-0.5 size-5 shrink-0 accent-accent"
            />
            <span>
              Review Characters Before They Can Be Played
              <span className="block text-ink-muted">New characters wait for someone with the “Review characters” permission to approve them.</span>
            </span>
          </label>
        ) : null}
      </fieldset>

      {community ? (
        <fieldset className="flex flex-col">
          <legend className="mb-1 text-sm font-medium text-ink">Play Style</legend>
          <label className={checkRow}>
            <input type="checkbox" name="dndMode" defaultChecked={community.dndMode} className="mt-0.5 size-5 shrink-0 accent-accent" />
            <span>
              DnD Mode
              <span className="block text-ink-muted">
                Writers can roll dice in this community’s scenes. Each roll is made by WorldRoot and recorded in the story, where it cannot be edited.
              </span>
            </span>
          </label>
        </fieldset>
      ) : null}

      {saved ? (
        <p role="status" className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-text">
          Saved.
        </p>
      ) : null}
      <FormFooter
        error={error}
        pending={pending}
        submitLabel={community ? 'Save Changes' : 'Create Community'}
        cancelHref={community ? `/c/${community.slug}` : '/communities'}
      />
    </form>
  );
}
