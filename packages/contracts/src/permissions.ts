/**
 * The permission registry. Keys are defined here in code and granted to roles in data.
 * Adding a permission is one entry here plus one `authorize` call site.
 * The roles interface is generated from this list.
 */
export const PERMISSION_GROUPS = ['Community', 'Worlds', 'Characters', 'Scenes', 'Spaces', 'Moderation'] as const;
export type PermissionGroup = (typeof PERMISSION_GROUPS)[number];

interface PermissionDefinition {
  group: PermissionGroup;
  label: string;
  description: string;
}

export const PERMISSIONS = {
  'community.manage': { group: 'Community', label: 'Manage community', description: 'Edit the name, branding, rules and settings.' },
  'community.invite': { group: 'Community', label: 'Invite members', description: 'Create and revoke invite links.' },
  'role.manage': { group: 'Community', label: 'Manage roles', description: 'Create, edit and assign roles below their own.' },
  'member.kick': { group: 'Community', label: 'Remove members', description: 'Remove a member, who may rejoin.' },
  'member.ban': { group: 'Community', label: 'Ban members', description: 'Remove a member and prevent them rejoining.' },

  'world.add': { group: 'Worlds', label: 'Add worlds', description: 'Copy a world from a library into the community.' },
  'world.manage': { group: 'Worlds', label: 'Manage worlds', description: 'Edit world details and visibility.' },
  'location.create': { group: 'Worlds', label: 'Create locations', description: 'Add locations to a world.' },
  'location.manage': { group: 'Worlds', label: 'Manage locations', description: 'Edit, move and remove locations.' },

  'character.submit': { group: 'Characters', label: 'Add characters', description: 'Bring a character into the community.' },
  'character.approve': { group: 'Characters', label: 'Review characters', description: 'Approve or return submitted characters.' },
  'character.manage': { group: 'Characters', label: 'Manage characters', description: 'Edit or retire any community character.' },
  'characterfield.manage': { group: 'Characters', label: 'Manage character fields', description: 'Define the community character template.' },

  'scene.create': { group: 'Scenes', label: 'Start scenes', description: 'Create a scene in a visible location.' },
  'scene.join': { group: 'Scenes', label: 'Join scenes', description: 'Bring a character into an existing scene.' },
  'scene.manage': { group: 'Scenes', label: 'Manage scenes', description: 'Change the status and details of any scene.' },
  'post.remove': { group: 'Scenes', label: 'Remove posts', description: 'Remove a scene post, leaving a marker in its place.' },

  'announcement.post': { group: 'Spaces', label: 'Post announcements', description: 'Write in Announcements.' },
  'lounge.post': { group: 'Spaces', label: 'Post in the Lounge', description: 'Write in the Lounge.' },
  'message.remove': { group: 'Spaces', label: 'Remove messages', description: 'Remove messages in community spaces.' },

  'report.review': { group: 'Moderation', label: 'Review reports', description: 'See and act on reports in the community.' },
  'auditlog.view': { group: 'Moderation', label: 'View audit log', description: 'Read the record of privileged actions.' },
} as const satisfies Record<string, PermissionDefinition>;

export type PermissionKey = keyof typeof PERMISSIONS;

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

export const isPermissionKey = (value: string): value is PermissionKey => value in PERMISSIONS;

/** What every member holds on joining, until a community edits its Member role. */
export const DEFAULT_MEMBER_PERMISSIONS: PermissionKey[] = [
  'character.submit',
  'scene.create',
  'scene.join',
  'lounge.post',
];
