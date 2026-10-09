import { listAchievementProgress } from '@worldroot/core';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AchievementProgressList } from '@/features/identity/achievements';
import { SettingsTabs } from '@/features/identity/settings-tabs';
import { PageHeader } from '@/features/shell/page-header';
import { database } from '@/lib/server';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Achievements' };

export default async function AchievementsPage() {
  const viewer = await requireViewer();
  const { db } = await database();
  const rows = await listAchievementProgress(db, viewer.actor.userId);
  const earned = rows.filter((row) => row.earnedAt).length;

  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs />
      <p className="mb-6 mt-6 max-w-2xl text-ink-muted">
        You have earned {earned} of {rows.length}. Your{' '}
        <Link href={`/u/${viewer.profile.handle}`} className="font-medium text-accent-text underline">
          Profile
        </Link>{' '}
        shows the ones you have earned. Only you see the rest and how far along you are.
      </p>
      <AchievementProgressList rows={rows} />
    </>
  );
}
