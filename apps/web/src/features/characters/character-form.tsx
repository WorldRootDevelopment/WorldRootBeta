'use client';

import type { Character } from '@worldroot/core';
import { TextArea, TextField } from '@worldroot/ui';
import { FormFooter } from '@/features/shell/form-footer';
import { useApiForm } from '@/lib/use-api-form';

const groupClass = 'flex flex-col gap-5 border-t border-line pt-8';
const legendClass = 'font-serif text-xl font-semibold text-ink';

/** Create or edit a character. Only the name is required; the rest can be filled in over time. */
export function CharacterForm({ character }: { character?: Character }) {
  const { onSubmit, fields, error, pending } = useApiForm<{ character: { id: string } }>({
    method: character ? 'PATCH' : 'POST',
    url: character ? `/api/v1/characters/${character.id}` : '/api/v1/characters',
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
        <legend className={legendClass}>At a glance</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Pronouns" name="pronouns" defaultValue={value('pronouns')} error={fields.pronouns} maxLength={120} />
          <TextField label="Species" name="species" defaultValue={value('species')} error={fields.species} maxLength={120} />
          <TextField label="Age" name="age" defaultValue={value('age')} error={fields.age} maxLength={120} hint="Free text. “Late thirties” is fine." />
          <TextField label="Gender" name="gender" defaultValue={value('gender')} error={fields.gender} maxLength={120} />
        </div>
      </fieldset>

      <fieldset className={groupClass}>
        <legend className={legendClass}>Who they are</legend>
        <TextArea label="Appearance" name="appearance" defaultValue={value('appearance')} error={fields.appearance} />
        <TextArea label="Personality" name="personality" defaultValue={value('personality')} error={fields.personality} />
        <TextArea label="Biography" name="biography" defaultValue={value('biography')} error={fields.biography} rows={8} />
      </fieldset>

      <fieldset className={groupClass}>
        <legend className={legendClass}>Details</legend>
        <TextArea label="Skills and abilities" name="skills" defaultValue={value('skills')} error={fields.skills} rows={3} />
        <TextArea label="Likes" name="likes" defaultValue={value('likes')} error={fields.likes} rows={3} />
        <TextArea label="Dislikes" name="dislikes" defaultValue={value('dislikes')} error={fields.dislikes} rows={3} />
        <TextArea label="Voice" name="voice" defaultValue={value('voice')} error={fields.voice} rows={3} hint="How they sound and speak." />
      </fieldset>

      <fieldset className={groupClass}>
        <legend className={legendClass}>Content and boundaries</legend>
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
        submitLabel={character ? 'Save changes' : 'Create character'}
        cancelHref={character ? `/characters/${character.id}` : '/library'}
      />
    </form>
  );
}
