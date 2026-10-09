import { listCharacterFields, listCharactersForReview } from '@worldroot/core';
import type { Metadata } from 'next';
import { requireSection } from '@/features/community/admin/admin-view';
import { FieldsEditor, ReviewQueue } from '@/features/community/admin/character-admin';

export const metadata: Metadata = { title: 'Characters' };

const heading = 'font-display text-2xl font-semibold tracking-tight text-ink';

export default async function CharacterSettingsPage({ params }: { params: Promise<{ community: string }> }) {
  const { community, holds, db } = await requireSection((await params).community, ['characterfield.manage', 'character.approve']);
  const [fields, waiting] = await Promise.all([listCharacterFields(db, community.id), listCharactersForReview(db, community.id)]);

  return (
    <div className="flex flex-col gap-12">
      {holds(['character.approve']) ? (
        <section>
          <h2 className={heading}>Review</h2>
          <p className="mb-6 mt-2 max-w-2xl text-ink-muted">
            {community.requireCharacterApproval
              ? 'New characters wait here until someone approves them. A returned character goes back to its player to revise.'
              : 'Review is switched off, so new characters can be played at once. Turn it on under General.'}
          </p>
          <ReviewQueue characters={waiting} />
        </section>
      ) : null}

      {holds(['characterfield.manage']) ? (
        <section>
          <h2 className={heading}>Character template</h2>
          <p className="mb-6 mt-2 max-w-2xl text-ink-muted">
            Fields every character in this community is asked for, on top of the standard profile. Adding a required field does not
            remove characters already here.
          </p>
          <FieldsEditor communityId={community.id} fields={fields} />
        </section>
      ) : null}
    </div>
  );
}
