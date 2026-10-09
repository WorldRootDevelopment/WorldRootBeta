import type { Metadata } from 'next';
import { ListingForm } from '@/features/discover/listing-client';
import { PageHeader } from '@/features/shell/page-header';
import { Breadcrumbs } from '@/features/shell/prose';

export const metadata: Metadata = { title: 'New Listing' };

export default function NewListingPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Discover', href: '/discover' }, { label: 'Looking For RP', href: '/discover/partners' }, { label: 'New Listing' }]} />
      <PageHeader
        title="Looking For RP"
        lead="Say what you would like to write and who with. Other writers can message you from the listing; someone you share no community with reaches you as a message request."
      />
      <ListingForm />
    </>
  );
}
