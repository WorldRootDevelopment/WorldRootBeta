import { ACHIEVEMENT_KEYS, ACHIEVEMENTS, type AchievementKey } from '@worldroot/contracts';
import type { EarnedAchievement } from '@worldroot/core';
import { Dices, Drama, Earth, Feather, HeartHandshake, Lock, Map as MapIcon, PenTool, Skull, Sparkles, Tent, type LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';

// Each achievement has its own picture and its own colour, fixed whatever the profile's colour is.
const LOOK: Record<AchievementKey, { icon: LucideIcon; hue: number }> = {
  first_words: { icon: Feather, hue: 200 },
  wordsmith: { icon: PenTool, hue: 265 },
  ensemble_cast: { icon: Drama, hue: 330 },
  worldbuilder: { icon: Earth, hue: 150 },
  cartographer: { icon: MapIcon, hue: 95 },
  host: { icon: Tent, hue: 40 },
  good_company: { icon: HeartHandshake, hue: 10 },
  dice_goblin: { icon: Dices, hue: 130 },
  natural_20: { icon: Sparkles, hue: 85 },
  critical_fumble: { icon: Skull, hue: 300 },
};

const day = (date: Date) => date.toLocaleDateString('en', { dateStyle: 'medium' });

interface AchievementsProps {
  earned: EarnedAchievement[];
  /** Also show the ones not yet earned, greyed, with how to earn them. For your own profile. */
  showLocked: boolean;
}

/** A person's achievements as a shelf of glossy medallions. */
export function Achievements({ earned, showLocked }: AchievementsProps) {
  const have = new Map(earned.map((row) => [row.key, row.earnedAt]));
  const keys = ACHIEVEMENT_KEYS.filter((key) => showLocked || have.has(key));
  if (keys.length === 0) return <p className="text-ink-muted">No achievements yet.</p>;

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {keys.map((key) => {
        const earnedAt = have.get(key);
        const { icon: Icon, hue } = LOOK[key];
        return (
          <li key={key} className={`wr-glass flex items-center gap-3 rounded-2xl p-3 ${earnedAt ? '' : 'opacity-60'}`}>
            <span
              aria-hidden="true"
              style={{ '--wr-accent-hue': hue } as CSSProperties}
              className={`wr-accent-scope flex size-12 shrink-0 items-center justify-center rounded-full ${earnedAt ? 'wr-gloss' : 'border border-dashed border-line-strong text-ink-muted'}`}
            >
              {earnedAt ? <Icon className="size-6" /> : <Lock className="size-5" />}
            </span>
            <span className="min-w-0">
              <span className="block font-display text-sm font-semibold text-ink">
                {ACHIEVEMENTS[key].label}
                {earnedAt ? null : <span className="sr-only"> (not earned yet)</span>}
              </span>
              <span className="block text-xs leading-snug text-ink-muted">{ACHIEVEMENTS[key].how}</span>
              {earnedAt ? <span className="mt-0.5 block text-xs text-ink-muted">Earned {day(earnedAt)}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
