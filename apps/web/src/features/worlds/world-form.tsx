'use client';

import type { Location, World } from '@worldroot/core';
import { TextArea, TextField } from '@worldroot/ui';
import { FormFooter } from '@/features/shell/form-footer';
import { useApiForm } from '@/lib/use-api-form';

/** Create or edit a library world. Only the name is required. */
export function WorldForm({ world }: { world?: World }) {
  const { onSubmit, fields, error, pending } = useApiForm<{ world: { id: string } }>({
    method: world ? 'PATCH' : 'POST',
    url: world ? `/api/v1/worlds/${world.id}` : '/api/v1/worlds',
    next: (body) => `/worlds/${body.world.id}`,
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
      <TextArea
        label="Description"
        name="description"
        defaultValue={world?.description ?? ''}
        error={fields.description}
        rows={10}
        hint="The setting, its tone, what a writer should know before stepping in. Any genre."
      />
      <FormFooter
        error={error}
        pending={pending}
        submitLabel={world ? 'Save changes' : 'Create world'}
        cancelHref={world ? `/worlds/${world.id}` : '/library'}
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
}

/** Create or edit a location. Only the name is required. */
export function WorldLocationForm({ worldId, location, parentId = null }: LocationFormProps) {
  const { onSubmit, fields, error, pending } = useApiForm<{ location: { id: string } }>({
    method: location ? 'PATCH' : 'POST',
    url: location ? `/api/v1/locations/${location.id}` : `/api/v1/worlds/${worldId}/locations`,
    extra: location ? undefined : { parentId },
    next: (body) => `/worlds/${worldId}/l/${body.location.id}`,
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
        cancelHref={location ? `/worlds/${worldId}/l/${location.id}` : parentId ? `/worlds/${worldId}/l/${parentId}` : `/worlds/${worldId}`}
      />
    </form>
  );
}
