'use client';

import type { Character } from '@worldroot/core';
import { TextArea, TextField } from '@worldroot/ui';
import { FormFooter } from '@/features/shell/form-footer';
import { RichField, useRichFields } from '@/features/shell/rich-field';
import { useApiForm } from '@/lib/use-api-form';

const RICH_FIELDS = ['appearance', 'personality', 'biography'] as const;

const groupClass = 'flex flex-col gap-5 border-t border-line pt-8';
const legendClass = 'font-display text-xl font-semibold text-ink';

/** Create or edit a character. Only the name is required; the rest can be filled in over time. */
export function CharacterForm({ character }: { character?: Character }) {
  const rich = useRichFields(RICH_FIELDS, character?.docs, (field) => character?.[field as keyof Character] as string | null | undefined);
  const { onSubmit, fields, error, pending } = useApiForm<{ character: { id: string } }>({
    method: character ? 'PATCH' : 'POST',
    url: character ? `/api/v1/characters/${character.id}` : '/api/v1/characters',
    extra: rich.values,
    next: (body) => `/characters/${body.character.id}`,
  });
  const value = (key: keyof Character) => (character?.[key] as string | null | undefined) ?? '';

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-8" noValidate>
      <div className="flex flex-col gap-5">
        <TextField label="Name" name="name" defaultValue={value('name')} error={fields.name} maxLength={120} required autoFocus={!character} />
        <TextField
          label="Tagline"
          name="tagline"
          defaultValue={value('tagline')}
          error={fields.tagline}
          maxLength={240}
          hint="One line that captures them. Shown on their card."
        />
      </div>

      <fieldset className={groupClass}>
        <legend className={legendClass}>At A Glance</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Pronouns" name="pronouns" defaultValue={value('pronouns')} error={fields.pronouns} maxLength={120} />
          <TextField label="Species" name="species" defaultValue={value('species')} error={fields.species} maxLength={120} />
          <TextField label="Age" name="age" defaultValue={value('age')} error={fields.age} maxLength={120} hint="Free text. “Late thirties” is fine." />
          <TextField label="Gender" name="gender" defaultValue={value('gender')} error={fields.gender} maxLength={120} />
        </div>
      </fieldset>

      <fieldset className={groupClass}>
        <legend className={legendClass}>Who They Are</legend>
        <RichField label="Appearance" initial={rich.values.appearance!} onChange={(doc) => rich.set('appearance', doc)} error={fields.appearance} />
        <RichField label="Personality" initial={rich.values.personality!} onChange={(doc) => rich.set('personality', doc)} error={fields.personality} />
        <RichField
          label="Biography"
          initial={rich.values.biography!}
          onChange={(doc) => rich.set('biography', doc)}
          error={fields.biography}
          minHeight="14rem"
          hint="Bold, italics, headings, quotes and links are available in these three."
        />
      </fieldset>

      <fieldset className={groupClass}>
        <legend className={legendClass}>Details</legend>
        <TextArea label="Skills And Abilities" name="skills" defaultValue={value('skills')} error={fields.skills} rows={3} />
        <TextArea label="Likes" name="likes" defaultValue={value('likes')} error={fields.likes} rows={3} />
        <TextArea label="Dislikes" name="dislikes" defaultValue={value('dislikes')} error={fields.dislikes} rows={3} />
        <TextArea label="Voice" name="voice" defaultValue={value('voice')} error={fields.voice} rows={3} hint="How they sound and speak." />
      </fieldset>

      <fieldset className={groupClass}>
        <legend className={legendClass}>Content And Boundaries</legend>
        <TextArea
          label="Boundaries"
          name="boundaries"
          defaultValue={value('boundaries')}
          error={fields.boundaries}
          rows={4}
          hint="What you are and are not comfortable writing with this character. Partners see this before a scene."
        />
      </fieldset>

      <FormFooter
        error={error}
        pending={pending}
        submitLabel={character ? 'Save Changes' : 'Create Character'}
        cancelHref={character ? `/characters/${character.id}` : '/library'}
      />
    </form>
  );
}
