'use client';

import { Button } from '@worldroot/ui';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';

/** The event a browser fires when it is willing to install this site as an app. Not yet in TypeScript's own definitions. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Installs WorldRoot as an app with its own window and icon.
 *
 * WorldRoot is a web app, not a program you download: the browser does the
 * installing, and the result opens from the Start menu, the Dock or the home
 * screen like any other app. Chrome and Edge let a page offer this with a
 * button; where the browser will not, the steps beside the button say how to
 * do it by hand.
 */
export function InstallAppButton() {
  const [offer, setOffer] = useState<InstallPromptEvent | null>(null);
  const [state, setState] = useState<'idle' | 'installed' | 'declined'>('idle');

  useEffect(() => {
    // Already running as an installed app: nothing to offer.
    if (window.matchMedia('(display-mode: standalone)').matches) setState('installed');
    const onOffer = (event: Event) => {
      // Keep the browser's own small prompt back, so the button decides when to ask.
      event.preventDefault();
      setOffer(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setOffer(null);
      setState('installed');
    };
    window.addEventListener('beforeinstallprompt', onOffer);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onOffer);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!offer) return;
    await offer.prompt();
    const { outcome } = await offer.userChoice;
    setOffer(null);
    setState(outcome === 'accepted' ? 'installed' : 'declined');
  };

  if (state === 'installed') {
    return (
      <p role="status" className="rounded-lg bg-accent-soft px-4 py-3 text-sm font-medium text-accent-text">
        WorldRoot is installed on this device. Look for it among your apps.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button size="lg" onClick={install} disabled={!offer}>
        <Download className="size-5" aria-hidden="true" />
        Install WorldRoot
      </Button>
      <p className="max-w-xl text-sm text-ink-muted">
        {offer
          ? 'One press. Your browser will ask you to confirm.'
          : state === 'declined'
            ? 'No problem. You can install it any time from your browser’s menu, using the steps below.'
            : 'Your browser has not offered one-press install on this page. Use the steps below for your device; it takes a few seconds.'}
      </p>
    </div>
  );
}
