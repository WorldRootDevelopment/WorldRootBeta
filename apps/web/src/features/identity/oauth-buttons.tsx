'use client';

import { Button } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export type OAuthProvider = 'discord' | 'google';

export const OAUTH_LABELS: Record<OAuthProvider, string> = { discord: 'Discord', google: 'Google' };

/** One button per configured provider. Renders nothing when none is configured. */
export function OAuthButtons({ providers, next }: { providers: OAuthProvider[]; next: string }) {
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (providers.length === 0) return null;

  const start = async (provider: OAuthProvider) => {
    setBusy(provider);
    setError(null);
    // A problem at the provider comes back to the sign-in page, which explains it.
    const result = await authClient.signIn.social({ provider, callbackURL: next, errorCallbackURL: '/sign-in' });
    if (result.error) {
      setBusy(null);
      setError(result.error.message ?? 'Could not reach the sign-in service. Try again.');
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-3">
      {providers.map((provider) => (
        <Button key={provider} variant="secondary" disabled={busy !== null} onClick={() => start(provider)}>
          {busy === provider ? `Opening ${OAUTH_LABELS[provider]}…` : `Continue With ${OAUTH_LABELS[provider]}`}
        </Button>
      ))}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <p className="flex items-center gap-3 text-xs text-ink-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">Or</p>
    </div>
  );
}

interface ConnectedAccountsProps {
  /** The providers this server has keys for. */
  available: OAuthProvider[];
  /** The ways this account can sign in now: `credential` is a password, the rest are providers. */
  methods: Array<{ provider: string; id: string }>;
}

/** In account settings: connect Discord or Google to an account, or disconnect one. */
export function ConnectedAccounts({ available, methods }: ConnectedAccountsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (available.length === 0) return <p className="text-sm text-ink-muted">Signing in with Discord or Google is not switched on for this site.</p>;

  const connect = async (provider: OAuthProvider) => {
    setBusy(provider);
    setError(null);
    const result = await authClient.linkSocial({ provider, callbackURL: '/settings/account' });
    if (result.error) {
      setBusy(null);
      setError(result.error.message ?? 'Could not start. Try again.');
    }
  };
  const disconnect = async (provider: OAuthProvider, accountId: string) => {
    setBusy(provider);
    setError(null);
    const result = await authClient.unlinkAccount({ accountId });
    setBusy(null);
    if (result.error) return setError(result.error.message ?? 'Could not disconnect it.');
    router.refresh();
  };
  // The last way in cannot be removed, or the account would be locked out.
  const onlyOne = methods.length <= 1;

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {available.map((provider) => {
          const connection = methods.find((method) => method.provider === provider);
          const connected = Boolean(connection);
          return (
            <li key={provider} className="wr-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
              <div>
                <p className="font-medium text-ink">{OAUTH_LABELS[provider]}</p>
                <p className="text-sm text-ink-muted">{connected ? 'Connected. You can sign in with it.' : 'Not connected.'}</p>
              </div>
              {connected ? (
                <Button variant="ghost" disabled={busy !== null || onlyOne} onClick={() => disconnect(provider, connection!.id)}>
                  Disconnect
                </Button>
              ) : (
                <Button variant="secondary" disabled={busy !== null} onClick={() => connect(provider)}>
                  {busy === provider ? 'Opening…' : 'Connect'}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {onlyOne && methods.some((method) => method.provider !== 'credential') ? <p className="text-sm text-ink-muted">This is your only way to sign in, so it cannot be disconnected.</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
