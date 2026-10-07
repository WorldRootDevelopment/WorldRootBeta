import { EmptyState } from '@worldroot/ui';
import { Compass } from 'lucide-react';
import type { Metadata } from 'next';
import { PageHeader } from '@/features/shell/page-header';

export const metadata: Metadata = { title: 'Discover' };

export default function DiscoverPage() {
  return (
    <>
      <PageHeader title="Discover" lead="Communities, worlds, active roleplay and writers looking for partners." />
      <EmptyState icon={<Compass className="size-8" aria-hidden="true" />} title="Nothing to explore yet">
        Discover opens once communities and scenes exist, in phase 4 of the build.
      </EmptyState>
    </>
  );
}
