'use client';

import { BADGES, GRANTABLE_BADGES } from '@worldroot/contracts';
import { Button, TextArea, TextField } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';

/** Quotes a value for a CSV cell. */
const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;

/**
 * Make a batch of redeem codes: one per line pasted in, such as each backer
 * number from a Kickstarter backer report. The codes are shown once, to
 * download as a spreadsheet and send; WorldRoot keeps only their hashes.
 */
export function CodeBatchForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ batch: string; codes: Array<{ reference: string; code: string }> } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const batch = String(form.get('batch') ?? '');
    setPending(true);
    const result = await send<{ codes: Array<{ reference: string; code: string }> }>('POST', '/api/v1/staff/codes', {
      batch,
      references: form.get('references'),
      grantsHeartwood: form.get('grantsHeartwood') === 'on',
      grantsMonths: form.get('grantsMonths') ? Number(form.get('grantsMonths')) : null,
      grantsBadge: form.get('grantsBadge') || null,
    });
    setPending(false);
    if (!result.ok || !result.data) return setError(result.message);
    setError(null);
    setMade({ batch, codes: result.data.codes });
    router.refresh();
  };

  const download = () => {
    if (!made) return;
    const text = ['Reference,Code', ...made.codes.map((row) => `${cell(row.reference)},${cell(row.code)}`)].join('\r\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${made.batch.replace(/[^\w-]+/g, '-').toLowerCase() || 'codes'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (made) {
    return (
      <div role="status" className="wr-glass flex max-w-2xl flex-col gap-3 rounded-2xl p-5">
        <p className="font-medium text-ink">
          {made.codes.length.toLocaleString('en')} codes made for “{made.batch}”.
        </p>
        <p className="text-sm text-ink">
          Download them now. This is the only time they can be seen: WorldRoot keeps only a scrambled copy that cannot be turned back into the code.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={download}>Download Codes</Button>
          <Button variant="ghost" onClick={() => setMade(null)}>
            Make Another Batch
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-4" noValidate>
      <TextField label="Batch Name" name="batch" defaultValue="Kickstarter" maxLength={80} required hint="For your records, such as Kickstarter 2026 or Kickstarter: Top Tier." />
      <TextArea
        label="One Line Per Code"
        name="references"
        rows={8}
        required
        hint="Paste a column from the backer report, such as backer numbers or emails. One code is made for each line, and the line stays beside its code in the download so you know who to send it to."
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-ink">Each Code Gives</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
          <input type="checkbox" name="grantsHeartwood" defaultChecked className="size-5 shrink-0 accent-accent" />
          WorldRoot Heartwood
        </label>
        <label className="flex flex-wrap items-center gap-3 pl-8 text-sm text-ink">
          For
          <select
            name="grantsMonths"
            defaultValue=""
            className="min-h-11 rounded-lg border border-line-strong bg-surface-raised px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
          >
            <option value="1">1 Month</option>
            <option value="3">3 Months</option>
            <option value="6">6 Months</option>
            <option value="12">12 Months</option>
            <option value="24">24 Months</option>
            <option value="">No End (Lifetime)</option>
          </select>
        </label>
        <label className="flex flex-wrap items-center gap-3 text-sm text-ink">
          Badge
          <select
            name="grantsBadge"
            defaultValue="kickstarter"
            className="min-h-11 rounded-lg border border-line-strong bg-surface-raised px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
          >
            <option value="">No Badge</option>
            {GRANTABLE_BADGES.map((key) => (
              <option key={key} value={key}>
                {BADGES[key].label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Making Codes…' : 'Make Codes'}
        </Button>
      </div>
    </form>
  );
}
