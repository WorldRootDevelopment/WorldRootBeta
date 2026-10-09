'use client';

import { REPORT_CATEGORIES, REPORT_CATEGORY_KEYS, type ReportTarget } from '@worldroot/contracts';
import type { ReportRow } from '@worldroot/core';
import { Button } from '@worldroot/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { send } from '@/features/scenes/api';

const linkButton =
  'rounded text-xs font-medium text-ink-muted hover:text-ink hover:underline ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

const field =
  'w-full rounded-lg border border-line-strong bg-surface-raised px-3 text-sm text-ink ' +
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus';

/** A "Report" link that opens a short form: a reason and an optional note. */
export function ReportButton({ targetType, targetId, label = 'Report' }: { targetType: ReportTarget; targetId: string; label?: string }) {
  const details = useRef<HTMLDetailsElement>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const result = await send('POST', '/api/v1/reports', { targetType, targetId, category: form.get('category'), note: form.get('note') });
    setPending(false);
    if (!result.ok) return setError(result.fields.category ?? result.message);
    setError(null);
    setSent(true);
  };

  return (
    <details ref={details} className="relative inline-block">
      <summary className={`${linkButton} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>{label}</summary>
      <div className="absolute right-0 z-20 mt-2 w-72 wr-popover rounded-xl p-4 text-left">
        {sent ? (
          <div role="status">
            <p className="text-sm font-medium text-ink">Thank you. It has been reported.</p>
            <p className="mt-1 text-sm text-ink-muted">The people who review reports will look at it. The person you reported is not told who reported them.</p>
            <Button variant="secondary" className="mt-3" onClick={() => details.current?.removeAttribute('open')}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              What is wrong?
              <select name="category" defaultValue="" required className={`${field} min-h-11 font-normal`}>
                <option value="" disabled>
                  Choose a reason
                </option>
                {REPORT_CATEGORY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {REPORT_CATEGORIES[key].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink">
              Anything to add? (optional)
              <textarea name="note" rows={3} maxLength={1000} className={`${field} resize-y py-2 font-normal`} />
            </label>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? 'Sending…' : 'Send report'}
            </Button>
          </form>
        )}
      </div>
    </details>
  );
}

/** One report in a review queue, with the controls to close it. */
function ReportCard({ report }: { report: ReportRow }) {
  const router = useRouter();
  const [resolution, setResolution] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = async (status: 'resolved' | 'dismissed') => {
    setPending(true);
    const result = await send('POST', `/api/v1/reports/${report.id}`, { status, resolution });
    setPending(false);
    setError(result.ok ? null : result.message);
    if (result.ok) router.refresh();
  };

  return (
    <li className="wr-glass rounded-2xl p-5">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-ink">{REPORT_CATEGORIES[report.category]?.label ?? report.category}</span>
        {report.escalated ? <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">Sent to WorldRoot staff</span> : null}
        {report.status !== 'open' ? <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-medium text-ink-muted">{report.status === 'resolved' ? 'Resolved' : 'Dismissed'}</span> : null}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {report.snapshot.where}
        {report.communityName && !report.snapshot.where.includes(report.communityName) ? ` · ${report.communityName}` : ''}
        {' · '}
        {report.createdAt.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        About {report.subjectHandle ? `@${report.subjectHandle}` : 'a former member'} · reported by {report.reporterHandle ? `@${report.reporterHandle}` : 'a former member'}
      </p>

      <blockquote className="mt-3 max-h-48 overflow-y-auto whitespace-pre-line rounded-lg bg-surface-sunken px-3 py-2 text-sm text-ink">
        {report.snapshot.text || 'Nothing was written.'}
      </blockquote>
      <p className="mt-1 text-xs text-ink-muted">As it read when it was reported. It may have been edited or removed since.</p>
      {report.note ? (
        <p className="mt-3 text-sm text-ink">
          <span className="font-medium">The reporter added:</span> {report.note}
        </p>
      ) : null}
      {report.snapshot.href ? (
        <p className="mt-3">
          <Link href={report.snapshot.href} className="text-sm font-medium text-accent-text underline underline-offset-2 hover:no-underline">
            Open it
          </Link>
        </p>
      ) : null}

      {report.status === 'open' ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
          <label htmlFor={`resolution-${report.id}`} className="text-sm font-medium text-ink">
            What was done (optional, kept on the record)
          </label>
          <input id={`resolution-${report.id}`} value={resolution} onChange={(event) => setResolution(event.target.value)} maxLength={1000} className={`${field} min-h-11`} />
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => close('resolved')} disabled={pending}>
              Resolved
            </Button>
            <Button variant="secondary" onClick={() => close('dismissed')} disabled={pending}>
              Dismiss, nothing to do
            </Button>
          </div>
        </div>
      ) : report.resolution ? (
        <p className="mt-3 text-sm text-ink-muted">Outcome: {report.resolution}</p>
      ) : null}
    </li>
  );
}

export function ReportQueue({ reports, emptyText }: { reports: ReportRow[]; emptyText: string }) {
  if (reports.length === 0) return <p className="text-ink-muted">{emptyText}</p>;
  return (
    <ul className="flex max-w-3xl flex-col gap-4">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </ul>
  );
}
