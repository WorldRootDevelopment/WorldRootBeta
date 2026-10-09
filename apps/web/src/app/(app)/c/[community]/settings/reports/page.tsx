import { listReports } from '@worldroot/core';
import type { Metadata } from 'next';
import { requireSection } from '@/features/community/admin/admin-view';
import { ReportQueue } from '@/features/moderation/report-client';
import { SectionHeading } from '@/features/shell/prose';

export const metadata: Metadata = { title: 'Reports' };

export default async function CommunityReportsPage({ params }: { params: Promise<{ community: string }> }) {
  const { community, viewer, db } = await requireSection((await params).community, ['report.review']);
  const scope = { communityId: community.id };
  const [open, handled] = await Promise.all([listReports(db, viewer.actor, scope), listReports(db, viewer.actor, scope, 'handled')]);

  return (
    <>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Reports</h2>
      <p className="mb-6 mt-2 max-w-2xl text-ink-muted">
        Things members have reported in {community.name}. Remove a post or message from where it sits, then mark the report resolved
        here. Reports about possible harm or law-breaking are also sent to WorldRoot staff.
      </p>
      <ReportQueue reports={open} emptyText="Nothing is waiting for review." />
      {handled.length > 0 ? (
        <>
          <SectionHeading>Dealt with</SectionHeading>
          <ReportQueue reports={handled} emptyText="" />
        </>
      ) : null}
    </>
  );
}
