import { EmptyState } from '@worldroot/ui';
import { Sprout } from 'lucide-react';
import type { Metadata } from 'next';
import { PageHeader } from '@/features/shell/page-header';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Home' };

export default async function HomePage() {
  const { profile } = await requireViewer();

  return (
    <>
      <PageHeader title={`Welcome, ${profile.displayName}`} lead="Scenes waiting on you and news from your communities will gather here." />
      <EmptyState icon={<Sprout className="size-8" aria-hidden="true" />} title="Nothing has taken root yet">
        Your first character is the place to start. The character library arrives in the next phase of the build.
      </EmptyState>
    </>
  );
}
