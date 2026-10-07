import { EmptyState } from '@worldroot/ui';
import { Inbox as InboxIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { PageHeader } from '@/features/shell/page-header';

export const metadata: Metadata = { title: 'Inbox' };

export default function InboxPage() {
  return (
    <>
      <PageHeader title="Inbox" lead="Messages and notifications in one place." />
      <EmptyState icon={<InboxIcon className="size-8" aria-hidden="true" />} title="Nothing new">
        Messages and notifications arrive in phase 4 of the build.
      </EmptyState>
    </>
  );
}
