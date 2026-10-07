import { EmptyState } from '@worldroot/ui';
import { BookOpen } from 'lucide-react';
import type { Metadata } from 'next';
import { PageHeader } from '@/features/shell/page-header';

export const metadata: Metadata = { title: 'Scenes' };

export default function ScenesPage() {
  return (
    <>
      <PageHeader title="Scenes" lead="Every scene you are writing in, with the ones waiting on you first." />
      <EmptyState icon={<BookOpen className="size-8" aria-hidden="true" />} title="No scenes yet">
        Scenes and the writing interface arrive in phase 2 of the build.
      </EmptyState>
    </>
  );
}
