import { BADGES, COMMUNITY_BADGES, type BadgeKey, type CommunityBadgeKey } from '@worldroot/contracts';
import { Crown, FlaskConical, Gem, Heart, ShieldCheck, Sprout, Wrench, type LucideIcon } from 'lucide-react';

const pill = 'inline-flex shrink-0 items-center rounded-full p-1 hover:gap-1 hover:px-1.5 focus-visible:gap-1 focus-visible:px-1.5 align-middle text-[0.6875rem] font-semibold leading-none';

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
  /** Platform badges this person holds. */
  list?: readonly BadgeKey[];
  /** Their standing in the community being viewed, if any. */
  community?: CommunityBadgeKey | null;
  /**
   * Show every platform badge. Only a profile does this. Everywhere else a
   * name carries the Staff badge alone, so the people who can act for
   * WorldRoot are always recognisable and nothing else crowds a name.
   */
  all?: boolean;
}

// The words stay in the page for screen readers and open out when the badge is pointed at or focused.
const label = 'max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-150 group-hover/badge:max-w-40 group-hover/badge:opacity-100 group-focus-visible/badge:max-w-40 group-focus-visible/badge:opacity-100';
const badge = `group/badge ${pill} cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`;

/**
 * The badges beside a person's name: an icon each, with its name shown on
 * hover or focus. Platform badges are filled pills; a community badge is an
 * outlined pill in the community's own colour. The difference in shape is
 * deliberate: WorldRoot staff must never be mistaken for a community's
 * admins, nor the reverse.
 */
export function Badges({ list = [], community = null, all = false }: BadgesProps) {
  const shown = all ? list : list.filter((key) => key === 'staff');
  if (shown.length === 0 && !community) return null;
  const CommunityIcon = community ? communityIcons[community] : null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {shown.map((key) => {
        const Icon = platformIcons[key];
        return (
          <span key={key} tabIndex={0} title={BADGES[key].title} className={`${badge} ${platformTones[BADGES[key].tone]}`}>
            <Icon className="size-3 shrink-0" aria-hidden="true" />
            <span className={label}>{BADGES[key].label}</span>
          </span>
        );
      })}
      {community && CommunityIcon ? (
        <span tabIndex={0} title={COMMUNITY_BADGES[community].title} className={`${badge} border border-accent text-accent-text`}>
          <CommunityIcon className="size-3 shrink-0" aria-hidden="true" />
          <span className={label}>{COMMUNITY_BADGES[community].label}</span>
        </span>
      ) : null}
    </span>
  );
}
