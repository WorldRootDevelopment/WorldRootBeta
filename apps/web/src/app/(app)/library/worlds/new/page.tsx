import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/features/shell/page-header';
import { Breadcrumbs } from '@/features/shell/prose';
import { WorldForm } from '@/features/worlds/world-form';

export const metadata: Metadata = { title: 'New World' };

export default function NewWorldPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Library', href: '/library' }, { label: 'New World' }]} />
      <PageHeader title="New World" lead="A setting of your own. You can add locations once it exists." />
      <p className="mb-8 max-w-2xl text-sm text-ink-muted">
        Would rather not start from a blank page?{' '}
        <Link href="/library/worlds/templates" className="font-medium text-accent-text underline underline-offset-2 hover:no-underline">
          Browse world templates
        </Link>
      </p>
      <WorldForm />
    </>
  );
}
