'use client';

import { Button } from '@worldroot/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { send } from '@/features/scenes/api';

/** A notification. Following it marks it read. */
export function NotificationLink({ id, href, unread, className, children }: { id: string; href: string; unread: boolean; className?: string; children: ReactNode }) {
  const router = useRouter();
  const markRead = () => {
    if (!unread) return;
    // Not awaited: the link should open at once. The refresh clears the dot on Inbox when it lands.
    void send('POST', '/api/v1/notifications/read', { id }).then(() => router.refresh());
  };
  return (
    <Link href={href} onClick={markRead} className={className}>
      {children}
    </Link>
  );
}

export function MarkAllReadButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markAll = async () => {
    setBusy(true);
    setError(null);
    const result = await send('POST', '/api/v1/notifications/read', {});
    setBusy(false);
    if (!result.ok) return setError(result.message);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3">
      <Button variant="secondary" onClick={markAll} disabled={busy}>
        Mark All Read
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
