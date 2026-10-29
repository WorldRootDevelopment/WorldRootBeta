import { listRecentUploads, UPLOAD_LIMITS } from '@worldroot/core';
import { buttonClass } from '@worldroot/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/features/shell/page-header';
import { Breadcrumbs } from '@/features/shell/prose';
import { RemoveUploadButton } from '@/features/staff/remove-upload-button';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Recent Uploads' };

const when = (date: Date) => date.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });
const size = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/**
 * Every picture uploaded to WorldRoot, newest first, for the Rootwardens to look over. Pictures are not
 * scanned, so this is where anything that breaks the rules is found and taken down.
 */
export default async function RecentUploadsPage({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const viewer = await requireViewer();
  if (viewer.actor.platformRole !== 'staff') notFound();
  const { before } = await searchParams;
  const { db } = await database();
  const uploads = await listRecentUploads(db, viewer.actor, { beforeId: before, limit: 60 });

  return (
    <>
      <Breadcrumbs items={[{ label: 'Rootwardens', href: '/staff' }, { label: 'Recent Uploads' }]} />
      <PageHeader
        title="Recent Uploads"
        lead={`Every picture uploaded, newest first. Removing one takes it off the site wherever it is shown, and is written to the audit log. Each person can upload ${UPLOAD_LIMITS.perHour} an hour and ${UPLOAD_LIMITS.perDay} a day.`}
      />
      {uploads.length === 0 ? (
        <p className="text-ink-muted">{before ? 'No earlier uploads.' : 'Nothing has been uploaded yet.'}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {uploads.map((upload) => (
            <li key={upload.id} className="wr-glass flex flex-col gap-3 rounded-2xl p-3">
              <a href={`/api/v1/media/${upload.id}`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                {/* A plain img: served by our own route, which the image optimizer cannot fetch without the session. */}
                <img src={`/api/v1/media/${upload.id}`} alt="Uploaded picture. Opens at full size." loading="lazy" className="aspect-square w-full object-cover" />
              </a>
              <div className="text-sm">
                <p className="text-ink">
                  {upload.uploader.handle ? (
                    <Link href={`/u/${upload.uploader.handle}`} className="font-medium hover:underline">
                      @{upload.uploader.handle}
                    </Link>
                  ) : (
                    <span className="text-ink-muted">A Former Member</span>
                  )}
                </p>
                <p className="text-xs text-ink-muted">
                  {when(upload.createdAt)} · {size(upload.byteSize)} · {upload.contentType.replace('image/', '').toUpperCase()}
                </p>
                <ul className="mt-2 flex flex-col gap-0.5 text-xs">
                  {upload.usedIn.length > 0 ? (
                    upload.usedIn.map((use, index) => (
                      <li key={index}>
                        {use.href ? (
                          <Link href={use.href} className="text-accent-text hover:underline">
                            {use.label}
                          </Link>
                        ) : (
                          use.label
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="text-ink-muted">Not shown anywhere yet</li>
                  )}
                </ul>
              </div>
              <div className="mt-auto">
                <RemoveUploadButton mediaId={upload.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {uploads.length === 60 ? (
        <p className="mt-8">
          <Link href={`/staff/uploads?before=${uploads.at(-1)!.id}`} className={buttonClass('secondary')}>
            Earlier Uploads
          </Link>
        </p>
      ) : null}
    </>
  );
}
