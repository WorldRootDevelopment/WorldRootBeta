import { getAccount, getOwnProfileSettings, listBlocked, listSignInMethods } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import type { Metadata } from 'next';
import { BlockedList, HandleForm, PasswordForm, SessionsPanel } from '@/features/identity/account-client';
import { ConnectedAccounts, type OAuthProvider } from '@/features/identity/oauth-buttons';
import { ResendVerification } from '@/features/identity/password-reset-forms';
import { RedeemForm } from '@/features/identity/redeem-form';
import { SettingsTabs } from '@/features/identity/settings-tabs';
import { PageHeader } from '@/features/shell/page-header';
import { SectionHeading } from '@/features/shell/prose';
import { database, oauthProviders } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Account' };

export default async function AccountSettingsPage({ searchParams }: { searchParams: Promise<{ verified?: string }> }) {
  const justVerified = (await searchParams).verified === '1';
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
      <p className="flex flex-wrap items-center gap-2 text-ink">
        {account.email}
        {account.emailVerified ? (
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-text">Confirmed</span>
        ) : (
          <span className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs font-medium text-ink-muted">Not Confirmed</span>
        )}
      </p>
      {justVerified && account.emailVerified ? (
        <p role="status" className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-text">
          Thank you. Your email address is confirmed.
        </p>
      ) : null}
      {account.emailVerified ? null : (
        <div className="mt-3 flex flex-col gap-2">
          <p className="max-w-2xl text-sm text-ink-muted">Confirm your address so you can get back into your account if you forget your password.</p>
          <ResendVerification email={account.email} />
        </div>
      )}

      <SectionHeading>Handle</SectionHeading>
      <HandleForm
        handle={profile.handle}
        nextChange={account.nextHandleChange ? account.nextHandleChange.toLocaleDateString('en', { dateStyle: 'long' }) : null}
      />

      <SectionHeading>Connected Accounts</SectionHeading>
      <p className="mb-4 max-w-xl text-sm text-ink-muted">Connect Discord or Google to sign in with one press. It also gives you a way back in if you forget your password.</p>
      <ConnectedAccounts available={available} methods={methods} />

      <SectionHeading>Your Data</SectionHeading>
      <p className="mb-3 max-w-2xl text-sm text-ink-muted">
        Download everything you have made on WorldRoot as one file: your profile, characters, worlds, stories, scene posts and messages.
        Other people&rsquo;s writing is not included, and pictures are listed by address.
      </p>
      {/* A plain link, so the browser saves the file. */}
      <a href="/api/v1/account/export" className={buttonClass('secondary')}>
        Download My Data
      </a>

      <SectionHeading>Redeem A Code</SectionHeading>
      <RedeemForm />

      <SectionHeading>Password</SectionHeading>
      {hasPassword ? <PasswordForm /> : <p className="max-w-xl text-sm text-ink-muted">This account has no password. You sign in with a connected account above.</p>}

      <SectionHeading>Devices</SectionHeading>
      <SessionsPanel />

      <SectionHeading>Blocked People</SectionHeading>
      <BlockedList people={blocked} />
    </>
  );
}
