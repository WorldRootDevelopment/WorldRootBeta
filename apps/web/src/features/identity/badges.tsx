import { BADGES, COMMUNITY_BADGES, type BadgeKey, type CommunityBadgeKey } from '@worldroot/contracts';
import { Crown, FlaskConical, Gem, Heart, ShieldCheck, Sprout, Wrench, type LucideIcon } from 'lucide-react';

const pill = 'inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 align-middle text-[0.6875rem] font-semibold leading-none';

const platformIcons: Record<BadgeKey, LucideIcon> = {
  staff: ShieldCheck,
  founder: Sprout,
  premium: Gem,
  early_supporter: Heart,
  beta_tester: FlaskConical,
};

// Platform badges are filled, in fixed colours that no community theme can change.
const platformTones: Record<(typeof BADGES)[BadgeKey]['tone'], string> = {
  staff: 'bg-staff text-staff-ink',
  premium: 'bg-premium text-premium-ink',
  special: 'bg-surface-sunken text-ink',
};

const communityIcons: Record<CommunityBadgeKey, LucideIcon> = { owner: Crown, admin: Wrench, moderator: ShieldCheck };

interface BadgesProps {
  /** Platform badges: the same wherever this person appears. */
  list?: readonly BadgeKey[];
  /** Their standing in the community being viewed, if any. */
  community?: CommunityBadgeKey | null;
  /** Icons only, with the words kept for screen readers. For tight spaces such as member lists. */
  compact?: boolean;
}

/**
 * The badges beside a person's name. Platform badges are filled pills; a
 * community badge is an outlined pill in the community's own colour. The
 * difference in shape is deliberate: WorldRoot staff must never be mistaken
 * for a community's admins, nor the reverse.
 */
export function Badges({ list = [], community = null, compact = false }: BadgesProps) {
  if (list.length === 0 && !community) return null;
  const CommunityIcon = community ? communityIcons[community] : null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {list.map((key) => {
        const Icon = platformIcons[key];
        return (
          <span key={key} title={BADGES[key].title} className={`${pill} ${platformTones[BADGES[key].tone]}`}>
            <Icon className="size-3" aria-hidden="true" />
            <span className={compact ? 'sr-only' : undefined}>{BADGES[key].label}</span>
          </span>
        );
      })}
      {community && CommunityIcon ? (
        <span title={COMMUNITY_BADGES[community].title} className={`${pill} border border-accent text-accent-text`}>
          <CommunityIcon className="size-3" aria-hidden="true" />
          <span className={compact ? 'sr-only' : undefined}>{COMMUNITY_BADGES[community].label}</span>
        </span>
      ) : null}
    </span>
  );
}
