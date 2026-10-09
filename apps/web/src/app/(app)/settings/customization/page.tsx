import { hasPremium, listOwnedItems } from '@worldroot/core';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DiceStylePicker } from '@/features/identity/dice-style-picker';
import { SiteThemePicker } from '@/features/identity/site-theme-picker';
import { SettingsTabs } from '@/features/identity/settings-tabs';
import { PageHeader } from '@/features/shell/page-header';
import { SectionHeading } from '@/features/shell/prose';
import { ThemeToggle } from '@/features/shell/theme-toggle';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Customization' };

export default async function CustomizationPage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const [owned, heartwood] = await Promise.all([listOwnedItems(db, viewer.actor.userId), hasPremium(db, viewer.actor)]);

  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs />
      <p className="mb-2 mt-6 text-ink-muted">How WorldRoot looks for you.</p>

      <SectionHeading>Site Theme</SectionHeading>
      <p className="mb-5 max-w-2xl text-sm text-ink-muted">
        How the whole of WorldRoot looks for you, on every device you sign in on. Nobody else sees your choice, and it changes nothing about
        how the site works.
      </p>
      <SiteThemePicker theme={viewer.profile.siteTheme} heartwood={heartwood} />

      <SectionHeading>Light Or Dark</SectionHeading>
      <p className="mb-4 max-w-2xl text-sm text-ink-muted">
        Follow your device, or keep WorldRoot light or dark whatever it says. The same choice is in your account menu. It is remembered on this
        device.
      </p>
      <div className="max-w-xs">
        <ThemeToggle />
      </div>

      <SectionHeading>Dice Style</SectionHeading>
      <p className="mb-5 max-w-2xl text-sm text-ink-muted">
        Used wherever you roll dice. A style only changes how your dice look to you: WorldRoot makes every roll, and the result in the story is the
        same for everyone.
      </p>
      <DiceStylePicker theme={viewer.profile.diceTheme} owned={owned} />

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
