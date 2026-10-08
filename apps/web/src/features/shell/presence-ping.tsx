'use client';

import { useEffect } from 'react';

const PING_MS = 60_000;

/**
 * Tells WorldRoot this person has it open, once a minute while the tab is
 * visible. That is what marks them online in their communities' lounges.
 * A hidden tab stops checking in, so they drop off the list a couple of minutes later.
 */
export function PresencePing() {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState === 'visible') void fetch('/api/v1/presence', { method: 'POST' }).catch(() => {});
    };
    ping();
    const timer = setInterval(ping, PING_MS);
    document.addEventListener('visibilitychange', ping);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', ping);
    };
  }, []);

  return null;
}
