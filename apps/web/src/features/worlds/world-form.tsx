'use client';

import type { Location, World } from '@worldroot/core';
import { TextArea, TextField } from '@worldroot/ui';
import { FormFooter } from '@/features/shell/form-footer';
import { RichField, useRichFields } from '@/features/shell/rich-field';
import { useApiForm } from '@/lib/use-api-form';

interface WorldFormProps {
  /** Present when editing. */
  world?: World;
  /** Where to go after saving or cancelling. For a community's copy of a world this is its page in the community. */
  returnTo?: string;
}

/** Create a library world, or edit a world: one in a library, or a community's own copy. Only the name is required. */
export function WorldForm({ world, returnTo }: WorldFormProps) {
  const rich = useRichFields(['description'], world?.docs, () => world?.description);
  const { onSubmit, fields, error, pending } = useApiForm<{ world: { id: string } }>({
    method: world ? 'PATCH' : 'POST',
    url: world ? `/api/v1/worlds/${world.id}` : '/api/v1/worlds',
    extra: rich.values,
    next: (body) => returnTo ?? `/worlds/${body.world.id}`,
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-5" noValidate>
      <TextField label="Name" name="name" defaultValue={world?.name ?? ''} error={fields.name} maxLength={120} required autoFocus={!world} />
      <TextField
        label="Summary"
        name="summary"
        defaultValue={world?.summary ?? ''}
        error={fields.summary}
        maxLength={240}
        hint="One line. Shown on the world's card."
      />
      <RichField
        label="Description"
        initial={rich.values.description!}
        onChange={(doc) => rich.set('description', doc)}
        error={fields.description}
        minHeight="16rem"
        hint="The setting, its tone, what a writer should know before stepping in. Any genre."
      />
      <FormFooter
        error={error}
        pending={pending}
        submitLabel={world ? 'Save changes' : 'Create world'}
        cancelHref={returnTo ?? (world ? `/worlds/${world.id}` : '/library')}
      />
    </form>
  );
}

interface LocationFormProps {
  worldId: string;
  /** Present when editing. */
  location?: Location;
  /** When creating: the location this one sits inside, if any. */
  parentId?: string | null;
  /** The world's own page, which location pages hang from. Defaults to the library's; a community's world passes its own. */
  base?: string;
}

/** Create or edit a location. Only the name is required. */
export function WorldLocationForm({ worldId, location, parentId = null, base = `/worlds/${worldId}` }: LocationFormProps) {
  const { onSubmit, fields, error, pending } = useApiForm<{ location: { id: string } }>({
    method: location ? 'PATCH' : 'POST',
    url: location ? `/api/v1/locations/${location.id}` : `/api/v1/worlds/${worldId}/locations`,
    extra: location ? undefined : { parentId },
    next: (body) => `${base}/l/${body.location.id}`,
  });

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-5" noValidate>
      <TextField label="Name" name="name" defaultValue={location?.name ?? ''} error={fields.name} maxLength={120} required autoFocus={!location} />
      <TextField label="Summary" name="summary" defaultValue={location?.summary ?? ''} error={fields.summary} maxLength={240} hint="One line. Shown in the location list." />
      <TextArea
        label="Description"
        name="description"
        defaultValue={location?.description ?? ''}
        error={fields.description}
        rows={8}
        hint="What it looks, sounds and feels like to be here."
      />
      <FormFooter
        error={error}
        pending={pending}
        submitLabel={location ? 'Save changes' : 'Add location'}
        cancelHref={location ? `${base}/l/${location.id}` : parentId ? `${base}/l/${parentId}` : base}
      />
    </form>
  );
}
