'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { send } from '@/features/scenes/api';

/** Takes one picture off the site, after asking. */
export function RemoveUploadButton({ mediaId }: { mediaId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    if (!window.confirm('Take this picture off WorldRoot everywhere it is shown? This cannot be undone.')) return;
    setBusy(true);
    const result = await send('DELETE', `/api/v1/staff/uploads/${mediaId}`);
    setBusy(false);
    if (!result.ok) return window.alert(result.message);
    router.refresh();
  };
  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="min-h-9 rounded-full border border-line-strong px-3 text-xs font-medium text-danger hover:bg-danger-soft disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {busy ? 'Removing…' : 'Remove'}
    </button>
  );
}
