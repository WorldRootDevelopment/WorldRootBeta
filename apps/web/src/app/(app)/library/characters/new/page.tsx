import type { Metadata } from 'next';
import { CharacterForm } from '@/features/characters/character-form';
import { PageHeader } from '@/features/shell/page-header';
import { Breadcrumbs } from '@/features/shell/prose';

export const metadata: Metadata = { title: 'New character' };

export default function NewCharacterPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Library', href: '/library' }, { label: 'New character' }]} />
      <PageHeader title="New character" lead="Start with a name. Everything else is optional and can be added whenever you like." />
      <CharacterForm />
    </>
  );
}
