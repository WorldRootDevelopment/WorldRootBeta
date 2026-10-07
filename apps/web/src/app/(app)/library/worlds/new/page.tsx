import type { Metadata } from 'next';
import { PageHeader } from '@/features/shell/page-header';
import { Breadcrumbs } from '@/features/shell/prose';
import { WorldForm } from '@/features/worlds/world-form';

export const metadata: Metadata = { title: 'New world' };

export default function NewWorldPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Library', href: '/library' }, { label: 'New world' }]} />
      <PageHeader title="New world" lead="A setting of your own. You can add locations once it exists." />
      <WorldForm />
    </>
  );
}
