import { ACHIEVEMENTS, isBadgeKey, type AchievementKey } from '@worldroot/contracts';
import type { AchievementProgress, EarnedAchievement } from '@worldroot/core';
import {
  Award,
  BookOpen,
  Camera,
  Clapperboard,
  Dices,
  Drama,
  Earth,
  Feather,
  Flag,
  Heart,
  HeartHandshake,
  Lock,
  Map as MapIcon,
  Megaphone,
  PenTool,
  Skull,
  Sparkles,
  Sprout,
  Tent,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';

// Each achievement has its own picture and its own color, fixed whatever the profile's color is.
const LOOK: Record<AchievementKey, { icon: LucideIcon; hue: number }> = {
  first_words: { icon: Feather, hue: 200 },
  storyteller: { icon: BookOpen, hue: 230 },
  wordsmith: { icon: PenTool, hue: 265 },
  scene_setter: { icon: Clapperboard, hue: 290 },
  the_end: { icon: Flag, hue: 20 },
  new_face: { icon: UserPlus, hue: 345 },
  ensemble_cast: { icon: Drama, hue: 330 },
  world_seed: { icon: Sprout, hue: 140 },
  worldbuilder: { icon: Earth, hue: 160 },
  cartographer: { icon: MapIcon, hue: 95 },
  host: { icon: Tent, hue: 40 },
  regular: { icon: Users, hue: 60 },
  open_call: { icon: Megaphone, hue: 25 },
  face_to_the_name: { icon: Camera, hue: 215 },
  kindred_spirit: { icon: Heart, hue: 0 },
  good_company: { icon: HeartHandshake, hue: 10 },
  dice_goblin: { icon: Dices, hue: 130 },
  natural_20: { icon: Sparkles, hue: 85 },
  critical_fumble: { icon: Skull, hue: 300 },
};

/** A note on the achievements that also put a badge on your profile. */
function AlsoBadge({ id }: { id: AchievementKey }) {
  if (!isBadgeKey(id)) return null;
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 align-middle text-[0.6875rem] font-semibold text-accent-text">
      <Award className="size-3" aria-hidden="true" />
      Gives A Badge
    </span>
  );
}

const day = (date: Date) => date.toLocaleDateString('en', { dateStyle: 'medium' });

function Medallion({ id, earned }: { id: AchievementKey; earned: boolean }) {
  const { icon: Icon, hue } = LOOK[id];
  return (
    <span
      aria-hidden="true"
      style={{ '--wr-accent-hue': hue } as CSSProperties}
      className={`wr-accent-scope flex size-12 shrink-0 items-center justify-center rounded-full ${earned ? 'wr-gloss' : 'border border-dashed border-line-strong text-ink-muted'}`}
    >
      {earned ? <Icon className="size-6" /> : <Lock className="size-5" />}
    </span>
  );
}

/** The achievements a person has earned, as a shelf of glossy medallions. This is all a profile shows. */
export function Achievements({ earned, compact = false }: { earned: EarnedAchievement[]; compact?: boolean }) {
  if (earned.length === 0) return <p className="text-ink-muted">No achievements yet.</p>;
  return (
    <ul className={compact ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3'}>
      {earned.map(({ key, earnedAt }) => (
        <li key={key} className="wr-glass flex items-center gap-3 rounded-2xl p-3">
          <Medallion id={key} earned />
          <span className="min-w-0">
            <span className="block font-display text-sm font-semibold text-ink">
              {ACHIEVEMENTS[key].label}
              <AlsoBadge id={key} />
            </span>
            <span className="block text-xs leading-snug text-ink-muted">{ACHIEVEMENTS[key].how}</span>
            <span className="mt-0.5 block text-xs text-ink-muted">Earned {day(earnedAt)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Every achievement, with how far along the person is. For their own Achievements page. */
export function AchievementProgressList({ rows }: { rows: AchievementProgress[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map(({ key, earnedAt, current, target }) => {
        const { label, how } = ACHIEVEMENTS[key];
        return (
          <li key={key} className={`wr-glass flex items-start gap-3 rounded-2xl p-3 ${earnedAt ? '' : 'opacity-80'}`}>
            <Medallion id={key} earned={Boolean(earnedAt)} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold text-ink">
                {label}
                {earnedAt ? null : <span className="sr-only"> (Not Earned Yet)</span>}
                <AlsoBadge id={key} />
              </p>
              <p className="text-xs leading-snug text-ink-muted">{how}</p>
              {earnedAt ? (
                <p className="mt-1 text-xs font-medium text-accent-text">Earned {day(earnedAt)}</p>
              ) : target > 1 ? (
                <div className="mt-2">
                  <progress value={current} max={target} aria-label={`${label}: ${current} Of ${target}`} className="wr-progress block h-1.5 w-full" />
                  <p className="mt-1 text-xs tabular-nums text-ink-muted">
                    {current} Of {target}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-xs text-ink-muted">Not Yet</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
