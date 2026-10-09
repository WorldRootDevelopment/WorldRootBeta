import { getAccount, getOwnProfileSettings, listBlocked } from '@worldroot/core';
import type { Metadata } from 'next';
import { BlockedList, HandleForm, PasswordForm, SessionsPanel } from '@/features/identity/account-client';
import { SettingsTabs } from '@/features/identity/settings-tabs';
import { PageHeader } from '@/features/shell/page-header';
import { SectionHeading } from '@/features/shell/prose';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Account' };

export default async function AccountSettingsPage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const [account, { profile }, blocked] = await Promise.all([
    getAccount(db, viewer.actor),
    getOwnProfileSettings(db, viewer.actor),
    listBlocked(db, viewer.actor),
  ]);

  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs />

      <SectionHeading>Email</SectionHeading>
      <p className="text-ink">{account.email}</p>
      <p className="mt-1 text-sm text-ink-muted">Changing your email arrives with email verification.</p>

      <SectionHeading>Handle</SectionHeading>
      <HandleForm
        handle={profile.handle}
        nextChange={account.nextHandleChange ? account.nextHandleChange.toLocaleDateString('en', { dateStyle: 'long' }) : null}
      />

      <SectionHeading>Password</SectionHeading>
      <PasswordForm />

      <SectionHeading>Devices</SectionHeading>
      <SessionsPanel />

      <SectionHeading>Blocked People</SectionHeading>
      <BlockedList people={blocked} />
    </>
  );
}
