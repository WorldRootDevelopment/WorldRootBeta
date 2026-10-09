import { DICE_THEMES, isDiceTheme, updateProfileSchema, type DiceThemeKey, type Profile, type UpdateProfileInput } from '@worldroot/contracts';
import { characters, communities, communityMembers, profiles, type Db } from '@worldroot/db';
import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { parseInput } from '../platform/validate';
import { getProfile, getProfileByHandle } from './profile';

/** The actor's own profile settings, including what other people do not see. */
export interface OwnProfileSettings {
  profile: Profile;
  hideOnline: boolean;
}

export async function getOwnProfileSettings(db: Db, actor: Actor): Promise<OwnProfileSettings> {
  const profile = await getProfile(db, actor.userId);
  if (!profile) throw new DomainError('not_found', 'Finish setting up your account first.');
  const [row] = await db.select({ hideOnline: profiles.hideOnline }).from(profiles).where(eq(profiles.userId, actor.userId));
  return { profile, hideOnline: row?.hideOnline ?? false };
}

/** Updates the actor's own profile. Nobody edits anyone else's. */
export async function updateProfile(db: Db, actor: Actor, input: UpdateProfileInput): Promise<Profile> {
  const { theme, ...rest } = parseInput(updateProfileSchema, input);
  // Left out, the background stays as it is. Null clears it.
  const background = theme === undefined ? {} : theme === null ? { themeFrom: null, themeTo: null } : { themeFrom: theme.from, themeTo: theme.to, themeAngle: theme.angle };
  const values = { ...rest, ...background };
  const [row] = await db.update(profiles).set(values).where(eq(profiles.userId, actor.userId)).returning({ userId: profiles.userId });
  if (!row) throw new DomainError('not_found', 'Finish setting up your account first.');
  return (await getProfile(db, actor.userId))!;
}

/**
 * Chooses how the actor's dice look. Only a free theme can be chosen: the
 * others wait for a way to earn or buy them, and until then nobody owns one.
 */
export async function setDiceTheme(db: Db, actor: Actor, theme: unknown): Promise<DiceThemeKey> {
  if (!isDiceTheme(theme)) throw new DomainError('invalid_input', 'That is not a dice theme.');
  if (!DICE_THEMES[theme].free) throw new DomainError('forbidden', 'That dice theme is not available yet.');
  const [row] = await db.update(profiles).set({ diceTheme: theme }).where(eq(profiles.userId, actor.userId)).returning({ userId: profiles.userId });
  if (!row) throw new DomainError('not_found', 'Finish setting up your account first.');
  return theme;
}

export interface ProfileView {
  profile: Profile;
  isSelf: boolean;
  joinedAt: Date;
  /** Communities this person belongs to that the viewer is able to see. */
  communities: Array<{ slug: string; name: string; accentHue: number }>;
  /** Their characters in those communities. Library originals are private and never listed. */
  characters: Array<{ id: string; name: string; tagline: string | null; communityName: string; communitySlug: string }>;
}

/**
 * A person's public profile, as one viewer may see it. It shows only what the
 * viewer could already find: communities that are listed or that they share,
 * and the characters this person plays there.
 */
export async function getProfileView(db: Db, actor: Actor, handle: string): Promise<ProfileView> {
  const profile = await getProfileByHandle(db, handle.replace(/^@/, ''));
  if (!profile) throw new DomainError('not_found', 'No one has that handle.');
  const [row] = await db.select({ createdAt: profiles.createdAt }).from(profiles).where(eq(profiles.userId, profile.userId));

  const theirs = await db
    .select({ community: communities })
    .from(communityMembers)
    .innerJoin(communities, eq(communities.id, communityMembers.communityId))
    .where(eq(communityMembers.userId, profile.userId))
    .orderBy(asc(communities.name));

  const staff = actor.platformRole === 'staff';
  const shared = new Set(
    (await db.select({ id: communityMembers.communityId }).from(communityMembers).where(eq(communityMembers.userId, actor.userId))).map(
      (membership) => membership.id,
    ),
  );
  const visible = theirs
    .map((membership) => membership.community)
    .filter((community) => staff || shared.has(community.id) || (community.listed && !community.archivedAt));

  const cast =
    visible.length === 0
      ? []
      : await db
          .select({ id: characters.id, name: characters.name, tagline: characters.tagline, communityId: characters.communityId })
          .from(characters)
          .where(
            and(
              eq(characters.playerUserId, profile.userId),
              inArray(
                characters.communityId,
                visible.map((community) => community.id),
              ),
              // A character still waiting for review is its player's business until it is approved.
              or(eq(characters.approvalStatus, 'approved'), isNull(characters.approvalStatus)),
            ),
          )
          .orderBy(asc(characters.name));
  const byId = new Map(visible.map((community) => [community.id, community]));

  return {
    profile,
    isSelf: profile.userId === actor.userId,
    joinedAt: row!.createdAt,
    communities: visible.map(({ slug, name, accentHue }) => ({ slug, name, accentHue })),
    characters: cast.map((character) => ({
      id: character.id,
      name: character.name,
      tagline: character.tagline,
      communityName: byId.get(character.communityId!)!.name,
      communitySlug: byId.get(character.communityId!)!.slug,
    })),
  };
}
