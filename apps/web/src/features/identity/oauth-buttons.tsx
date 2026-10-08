'use client';

import { Button } from '@worldroot/ui';
import { authClient } from '@/lib/auth-client';

export type OAuthProvider = 'discord' | 'google';

const labels: Record<OAuthProvider, string> = { discord: 'Discord', google: 'Google' };

/** One button per configured provider. Renders nothing when none is configured. */
export function OAuthButtons({ providers, next }: { providers: OAuthProvider[]; next: string }) {
  if (providers.length === 0) return null;
  return (
    <div className="mb-6 flex flex-col gap-3">
      {providers.map((provider) => (
        <Button
          key={provider}
          variant="secondary"
          onClick={() => authClient.signIn.social({ provider, callbackURL: next })}
        >
          Continue with {labels[provider]}
        </Button>
      ))}
      <p className="flex items-center gap-3 text-xs text-ink-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        or
      </p>
    </div>
  );
}
