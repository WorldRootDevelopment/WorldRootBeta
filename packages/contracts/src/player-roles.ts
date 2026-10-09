import { z } from 'zod';

/**
 * Player roles: the things people say about themselves in every roleplay
 * community, such as their pronouns and whether they want direct messages.
 * A person chooses them once, on their own profile, and they are shown beside
 * their name in every community, under whatever roles that community gave them.
 *
 * They describe the writer, never a character, and they grant nothing: no
 * permission anywhere depends on one. Stored as `group:option` keys, so the
 * wording here can change without touching anyone's choices; a key must never
 * be reused for a different meaning.
 */
interface PlayerRoleGroup {
  label: string;
  /** Whether several can be chosen at once. */
  many: boolean;
  options: Record<string, string>;
}

/** In display order. */
export const PLAYER_ROLE_GROUPS = {
  pronouns: {
    label: 'Pronouns',
    many: true,
    options: { she: 'She/Her', he: 'He/Him', they: 'They/Them', it: 'It/Its', any: 'Any Pronouns', ask: 'Ask My Pronouns' },
  },
  dms: { label: 'Direct Messages', many: false, options: { open: 'DMs Open', ask: 'Ask Before DMing', closed: 'DMs Closed' } },
  seeking: { label: 'Looking For RP', many: false, options: { open: 'Open To RP', selective: 'Selective', closed: 'Not Looking' } },
  length: { label: 'Writing Length', many: true, options: { short: 'One-Liners', para: 'Paragraphs', multi: 'Multi-Paragraph', novella: 'Novella' } },
  pace: { label: 'Reply Pace', many: false, options: { rapid: 'Rapid Fire', daily: 'Daily', weekly: 'A Few A Week', slow: 'Slow Burn' } },
  region: {
    label: 'Region',
    many: false,
    options: { na: 'North America', sa: 'South America', eu: 'Europe', af: 'Africa', as: 'Asia', oc: 'Oceania' },
  },
  pings: { label: 'Pings', many: false, options: { ok: 'Ping Me', no: 'Do Not Ping' } },
} as const satisfies Record<string, PlayerRoleGroup>;

export type PlayerRoleGroupKey = keyof typeof PLAYER_ROLE_GROUPS;

export const PLAYER_ROLE_GROUP_KEYS = Object.keys(PLAYER_ROLE_GROUPS) as PlayerRoleGroupKey[];

/** A chosen role as it is shown. */
export interface PlayerRole {
  /** `group:option`, as stored. */
  key: string;
  group: PlayerRoleGroupKey;
  label: string;
}

const groups: Record<string, PlayerRoleGroup> = PLAYER_ROLE_GROUPS;

const split = (key: string): [string, string] => {
  const at = key.indexOf(':');
  return [key.slice(0, at), key.slice(at + 1)];
};

const known = (key: string): boolean => {
  const [group, option] = split(key);
  return Boolean(groups[group] && Object.hasOwn(groups[group].options, option));
};

export const playerRolesSchema = z
  .array(z.string().refine(known, { error: 'That is not one of the choices.' }))
  .max(24, 'Choose fewer.')
  .transform((keys) => [...new Set(keys)])
  .refine((keys) => PLAYER_ROLE_GROUP_KEYS.every((group) => groups[group]!.many || keys.filter((key) => split(key)[0] === group).length <= 1), {
    error: 'Choose only one where a single choice is asked for.',
  });

/** Turns stored keys into what is shown, in display order, dropping any this version no longer knows. */
export function toPlayerRoles(stored: unknown): PlayerRole[] {
  if (!Array.isArray(stored)) return [];
  const held = new Set(stored.filter((key): key is string => typeof key === 'string' && known(key)));
  return PLAYER_ROLE_GROUP_KEYS.flatMap((group) =>
    Object.entries(groups[group]!.options)
      .filter(([option]) => held.has(`${group}:${option}`))
      .map(([option, label]) => ({ key: `${group}:${option}`, group, label })),
  );
}
