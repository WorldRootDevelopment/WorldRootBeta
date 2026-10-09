import { getAccount, getOwnProfileSettings, listBlocked, listSignInMethods } from '@worldroot/core';
import type { Metadata } from 'next';
import { BlockedList, HandleForm, PasswordForm, SessionsPanel } from '@/features/identity/account-client';
import { ConnectedAccounts, type OAuthProvider } from '@/features/identity/oauth-buttons';
import { SettingsTabs } from '@/features/identity/settings-tabs';
import { PageHeader } from '@/features/shell/page-header';
import { SectionHeading } from '@/features/shell/prose';
import { database, oauthProviders } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Account' };

export default async function AccountSettingsPage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const [account, { profile }, blocked, methods] = await Promise.all([
    getAccount(db, viewer.actor),
    getOwnProfileSettings(db, viewer.actor),
    listBlocked(db, viewer.actor),
    listSignInMethods(db, viewer.actor),
  ]);
  const available = (Object.keys(oauthProviders) as OAuthProvider[]).filter((key) => oauthProviders[key]);
  const hasPassword = methods.some((method) => method.provider === 'credential');

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

      <SectionHeading>Connected Accounts</SectionHeading>
      <p className="mb-4 max-w-xl text-sm text-ink-muted">Connect Discord or Google to sign in with one press. It also gives you a way back in if you forget your password.</p>
      <ConnectedAccounts available={available} methods={methods} />

      <SectionHeading>Password</SectionHeading>
      {hasPassword ? <PasswordForm /> : <p className="max-w-xl text-sm text-ink-muted">This account has no password. You sign in with a connected account above.</p>}

      <SectionHeading>Devices</SectionHeading>
      <SessionsPanel />

      <SectionHeading>Blocked People</SectionHeading>
      <BlockedList people={blocked} />
    </>
  );
}
