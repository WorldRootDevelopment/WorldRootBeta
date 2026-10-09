import type { Metadata } from 'next';
import Link from 'next/link';
import { DiceStylePicker } from '@/features/identity/dice-style-picker';
import { SettingsTabs } from '@/features/identity/settings-tabs';
import { PageHeader } from '@/features/shell/page-header';
import { SectionHeading } from '@/features/shell/prose';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Customization' };

export default async function CustomizationPage() {
  const viewer = await requireViewer();

  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs />
      <p className="mb-2 mt-6 text-ink-muted">How WorldRoot looks for you.</p>

      <SectionHeading>Dice style</SectionHeading>
      <p className="mb-5 max-w-2xl text-sm text-ink-muted">
        Used wherever you roll dice. A style only changes how your dice look to you: WorldRoot makes every roll, and the result in the story is the
        same for everyone.
      </p>
      <DiceStylePicker theme={viewer.profile.diceTheme} />

      <SectionHeading>Profile</SectionHeading>
      <p className="max-w-2xl text-sm text-ink-muted">
        Your picture, banner, color and status line are under{' '}
        <Link href="/settings/profile" className="font-medium text-accent-text underline">
          Profile
        </Link>
        .
      </p>
    </>
  );
}
