import { BADGE_KEYS, BADGES, isAchievementKey } from '@worldroot/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeIcon } from '@/features/identity/badges';
import { SettingsTabs } from '@/features/identity/settings-tabs';
import { PageHeader } from '@/features/shell/page-header';
import { SectionHeading } from '@/features/shell/prose';
import { requireViewer } from '@/lib/session';

export const metadata: Metadata = { title: 'Badges' };

export default async function BadgesPage() {
  const viewer = await requireViewer();
  const mine = BADGE_KEYS.filter((key) => viewer.profile.badges.includes(key));
  const others = BADGE_KEYS.filter((key) => !viewer.profile.badges.includes(key));

  const list = (keys: typeof BADGE_KEYS, held: boolean) => (
    <ul className="grid max-w-4xl gap-3 sm:grid-cols-2">
      {keys.map((key) => (
        <li key={key} className={`wr-glass flex items-start gap-3 rounded-2xl p-4 ${held ? '' : 'opacity-80'}`}>
          <BadgeIcon badge={key} dimmed={!held} />
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-ink">{BADGES[key].label}</p>
            <p className="text-xs leading-snug text-ink-muted">{BADGES[key].how}</p>
            {isAchievementKey(key) ? (
              <p className="mt-1 text-xs">
                <Link href="/settings/achievements" className="font-medium text-accent-text underline">
                  {held ? 'From An Achievement' : 'See Your Progress'}
                </Link>
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs />
      <p className="mb-2 mt-6 max-w-2xl text-ink-muted">
        Badges sit beside your name on your{' '}
        <Link href={`/u/${viewer.profile.handle}`} className="font-medium text-accent-text underline">
          Profile
        </Link>
        . Only the Rootwarden badge, worn by WorldRoot staff, is shown beside a name everywhere else.
      </p>

      <SectionHeading>Your Badges — {mine.length}</SectionHeading>
      {mine.length === 0 ? <p className="text-ink-muted">You do not have any badges yet.</p> : list(mine, true)}

      <SectionHeading>Other Badges — {others.length}</SectionHeading>
      {others.length === 0 ? <p className="text-ink-muted">You have every badge there is.</p> : list(others, false)}
    </>
  );
}
