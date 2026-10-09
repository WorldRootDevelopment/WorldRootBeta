import { BADGES, COMMUNITY_BADGES, type BadgeKey, type CommunityBadgeKey } from '@worldroot/contracts';
import { Crown, FlaskConical, Gem, Heart, ShieldCheck, Sprout, Wrench, type LucideIcon } from 'lucide-react';

const pill = 'relative inline-flex shrink-0 items-center rounded-full p-1 align-middle text-[0.6875rem] font-semibold leading-none';

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

/*
 * The badge's name. It stays in the page for screen readers and floats just
 * below the badge when the badge is pointed at or focused. It floats rather
 * than widening the badge: a badge that grows pushes the one beside it, which
 * can wrap to the next line, slide out from under the pointer and flicker.
 * It hangs from the badge's right edge so it cannot run off the side of a
 * narrow list.
 */
const label =
  'pointer-events-none absolute right-0 top-full z-30 mt-1 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[0.6875rem] font-semibold leading-none text-surface opacity-0 shadow-raised ' +
  'transition-opacity duration-100 group-hover/badge:opacity-100 group-focus-visible/badge:opacity-100';
const badge = `group/badge ${pill} cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`;

/**
 * The badges beside a person's name: an icon each, with what it means shown
 * on hover or focus. Platform badges are filled pills; a community badge is an
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
          <span key={key} tabIndex={0} className={`${badge} ${platformTones[BADGES[key].tone]}`}>
            <Icon className="size-3 shrink-0" aria-hidden="true" />
            <span className={label}>{BADGES[key].title}</span>
          </span>
        );
      })}
      {community && CommunityIcon ? (
        <span tabIndex={0} className={`${badge} border border-accent text-accent-text`}>
          <CommunityIcon className="size-3 shrink-0" aria-hidden="true" />
          <span className={label}>{COMMUNITY_BADGES[community].title}</span>
        </span>
      ) : null}
    </span>
  );
}
