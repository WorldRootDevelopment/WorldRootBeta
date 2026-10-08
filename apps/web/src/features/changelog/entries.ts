export interface ChangelogEntry {
  /** Stable and unique. The menu remembers the newest id a person has seen. */
  id: string;
  /** ISO date the change shipped. */
  date: string;
  title: string;
  items: string[];
}

/**
 * What has changed in WorldRoot, newest first. Add a new entry at the top
 * whenever something a writer would notice ships; the menu shows a dot until
 * they open it.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-10-08-varrowmere-archive',
    date: '2026-10-08',
    title: 'Varrowmere, and archiving communities',
    items: [
      'A new page, Alternatives to boycotted franchises, linked from the landing page and your account menu.',
      'Its first universe is Varrowmere: an original school of magic, free for anyone to use. The Wizarding School template is now built on it.',
      'Community owners can archive a community to freeze it without losing anything, and restore it later.',
      'Owners can also delete a community for good, after typing its name to confirm.',
      'The landing page can now be opened while signed in.',
    ],
  },
  {
    id: '2026-10-08-templates',
    date: '2026-10-08',
    title: 'World templates',
    items: [
      'Start a world from a template instead of a blank page. Find them under Library, then World templates.',
      'Seven to begin with: Basic Town, Dungeons & Dragons, Wizarding School: Varrowmere, Star Wars, Jurassic Park, DC Comics and Marvel Comics.',
      'Each comes with its places already laid out and a list of character fields a community might want.',
      'The copy is yours: rename it, change anything, share it by ID or add it to a community.',
    ],
  },
  {
    id: '2026-10-08-demo-town',
    date: '2026-10-08',
    title: 'Demo Town',
    items: [
      'The demo community is now Demo Town: a small, ordinary town with a square, a main street, a station and a park.',
      'One Narrator character and two scenes to read or join. No setting to learn first.',
    ],
  },
  {
    id: '2026-10-08-world-ids',
    date: '2026-10-08',
    title: 'Share a world by ID',
    items: [
      'Create a world ID from any world in your library and give it to other writers.',
      'A community admin can add a shared world to their community by entering its ID.',
      'Enter an ID on your Library page to take your own copy of a shared world.',
      'Stop sharing at any time. Copies already made are not affected.',
    ],
  },
  {
    id: '2026-10-07-lounge-chat',
    date: '2026-10-07',
    title: 'The Lounge is now a chat room',
    items: [
      'Each community lounge is a live chat room that follows the conversation as it moves.',
      'A member list beside the chat shows who is online right now.',
      'Messages from the same person are grouped, with a divider between days.',
    ],
  },
  {
    id: '2026-10-07-messaging',
    date: '2026-10-07',
    title: 'Messages, Announcements and the Lounge',
    items: [
      'Send a direct message to any writer by their @handle, from the Inbox.',
      'Start a group conversation with up to 12 people.',
      'A dot on Inbox shows when a conversation has something new.',
      'Every community now has Announcements, for news from its staff, and a Lounge for everyone.',
      'Messages arrive live, and you can remove your own.',
    ],
  },
  {
    id: '2026-10-07-invites-bans',
    date: '2026-10-07',
    title: 'Invite links and bans',
    items: [
      'Create invite links for a community under Settings, with an expiry and a use limit.',
      'An unlisted community can now be joined by anyone holding one of its links.',
      'Someone new who opens an invite link is brought back to it after signing up.',
      'Ban a member so they cannot rejoin, and lift the ban later.',
    ],
  },
  {
    id: '2026-10-07-community-admin',
    date: '2026-10-07',
    title: 'Create and run a community',
    items: [
      'Create your own community from the Create menu or the Communities page.',
      'A Settings tab for owners and staff: name, about, rules, accent colour, and who can find it.',
      'Build custom roles from a list of permissions, and give them to members.',
      'Define the fields every character is asked for, and switch on character review.',
      'Add worlds from your library, remove members, and read the audit log.',
    ],
  },
  {
    id: '2026-10-07-live-and-edit',
    date: '2026-10-07',
    title: 'Live scenes, editing and removing posts',
    items: [
      'New posts now appear in an open scene as soon as they are sent.',
      'Edit your own posts. An edited post is marked as edited.',
      'Remove your own posts and out-of-character messages. A marker stays in their place.',
      'Community moderators can remove posts, and each removal is recorded.',
    ],
  },
  {
    id: '2026-10-07-changelog',
    date: '2026-10-07',
    title: 'What’s new menu',
    items: ['This menu. A dot appears on it whenever something has changed since you last looked.'],
  },
  {
    id: '2026-10-07-scenes',
    date: '2026-10-07',
    title: 'Scenes',
    items: [
      'Start a private scene and invite a writer by their @handle, or start one in a community location.',
      'Write with bold, italics, headings, quotes, scene breaks and links.',
      'Post as any of your characters in the scene, or as the narrator.',
      'Out-of-character talk has its own panel beside the story.',
      'Drafts save as you write. Scenes waiting on you are listed first.',
    ],
  },
  {
    id: '2026-10-07-library',
    date: '2026-10-07',
    title: 'Characters, worlds and locations',
    items: [
      'Create and edit characters in your Library. Only a name is required.',
      'Create worlds and build their locations, nested as deep as five levels.',
      'Add one of your characters to a community, filling in the fields it asks for.',
    ],
  },
  {
    id: '2026-10-07-demo',
    date: '2026-10-07',
    title: 'Demo community',
    items: ['A sample community with a world, characters and scenes to explore. Find it under Communities.'],
  },
  {
    id: '2026-10-07-foundations',
    date: '2026-10-07',
    title: 'Accounts and themes',
    items: ['Sign up, choose your handle, and switch between light, dark and system themes from the account menu.'],
  },
];
