import type { Metadata } from 'next';
import { ListingForm } from '@/features/discover/listing-client';
import { PageHeader } from '@/features/shell/page-header';
import { Breadcrumbs } from '@/features/shell/prose';

export const metadata: Metadata = { title: 'New listing' };

export default function NewListingPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Discover', href: '/discover' }, { label: 'Looking for RP', href: '/discover/partners' }, { label: 'New listing' }]} />
      <PageHeader
        title="Looking for RP"
        lead="Say what you would like to write and who with. Other writers can message you from the listing; someone you share no community with reaches you as a message request."
      />
      <ListingForm />
    </>
  );
}
