import type { Metadata } from 'next';
import { CommunitySettingsForm } from '@/features/community/admin/settings-form';
import { PageHeader } from '@/features/shell/page-header';
import { Breadcrumbs } from '@/features/shell/prose';

export const metadata: Metadata = { title: 'New Community' };

export default function NewCommunityPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Communities', href: '/communities' }, { label: 'New Community' }]} />
      <PageHeader
        title="New Community"
        lead="A shared home for worlds, characters and scenes. You become its owner and can set up roles, rules and a character template afterward."
      />
      <CommunitySettingsForm />
    </>
  );
}
