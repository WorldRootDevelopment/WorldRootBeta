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
    id: '2026-10-09-title-case',
    date: '2026-10-09',
    title: 'Title Case For Headings And Buttons',
    items: ['Headings, buttons, tabs, menus, field labels and the names of badges and achievements are now in Title Case. Descriptions and messages are still written as sentences.'],
  },
  {
    id: '2026-10-09-community-world-editing',
    date: '2026-10-09',
    title: 'Community Staff Can Edit Their Worlds',
    items: [
      'Once a world has been added to a community, the community’s staff can edit it there: its name, summary and description, and its locations.',
      'Who can do what is set by three permissions on a role: Manage Worlds, Create Locations and Manage Locations. Owners have all three.',
      'Edits change the community’s own copy only. The original in its author’s library is never touched.',
      'Every edit is written to the community’s audit log.',
    ],
  },
  {
    id: '2026-10-09-rootwardens',
    date: '2026-10-09',
    title: 'Rootwardens, And Names From The World Tree',
    items: [
      'WorldRoot staff are now called Rootwardens, after those who tend the roots of the World Tree. Their badge still tells you plainly that they are WorldRoot staff.',
      'Badges have new names to match: Seedbearer (founder), Deeproot (early supporter) and Seedling (beta tester).',
      'Two achievements are renamed: Wordsmith is now Skald, and Regular is now Three Branches.',
      'The report form opens in the middle of the screen, so it is never cut off.',
      'Profiles have more room for the name, with the buttons on their own row when space is short.',
    ],
  },
  {
    id: '2026-10-09-badges-tab',
    date: '2026-10-09',
    title: 'A Badges Tab, And A Note On Achievements That Give One',
    items: [
      'Settings has a Badges tab showing the badges you have, the ones you do not, and how each is come by.',
      'An achievement that also gives a badge now says so.',
      'WorldRoot may dress up for an occasion from time to time: look for the logo and the stripe along the top.',
    ],
  },
  {
    id: '2026-10-09-popups-achievements-dice',
    date: '2026-10-09',
    title: 'Profile Pop-Ups, More Achievements And A Better Dice Throw',
    items: [
      'Clicking someone’s name opens their profile in a pop-up over the page you are on. Close it and you are back where you were.',
      'Nineteen achievements now, with a new Achievements tab in Settings that shows them all and how far along you are.',
      'Profiles show only the achievements a person has earned.',
      'Worldbuilder and Cartographer are also badges, shown in the badge row on your profile.',
      'Dice are thrown into the tray: they bounce, roll and slow to a stop.',
      'Spelling is now American English throughout.',
    ],
  },
  {
    id: '2026-10-09-customization',
    date: '2026-10-09',
    title: 'A Customization Tab In Settings',
    items: ['Dice styles moved out of the dice tray to Settings, under a new Customization tab, where you can see the whole set in each style.'],
  },
  {
    id: '2026-10-08-badge-labels',
    date: '2026-10-08',
    title: 'Badge Labels No Longer Jump',
    items: ['Pointing at a badge now shows what it means in a small label beneath it, without moving the badges beside it.'],
  },
  {
    id: '2026-10-08-dice-tray',
    date: '2026-10-08',
    title: 'A Proper Dice Tray',
    items: [
      'Dice now have their real shapes: a d4 is a pyramid, a d20 an icosahedron, and a d6 is still a cube.',
      'The dice box is rebuilt as a tray. Pick a die by its shape, set how many and what to add, and roll.',
      'Dice styles: Classic, Ivory and Obsidian are free to choose. More are on the way.',
    ],
  },
  {
    id: '2026-10-08-quieter-badges',
    date: '2026-10-08',
    title: 'Quieter Badges',
    items: [
      'Badges are now a small icon. Point at one, or tab to it, to see its name.',
      'Founder, Premium, Early supporter and Beta tester badges are shown on profiles only.',
      'The Staff badge still appears beside a name everywhere, so WorldRoot staff are always recognizable.',
    ],
  },
  {
    id: '2026-10-08-friends-profiles-sidebar',
    date: '2026-10-08',
    title: 'Friends, Richer Profiles, Achievements And A New Sidebar',
    items: [
      'Friends: add someone by @handle or from their profile. Friends can message each other without a request, and see when the other is online.',
      'The Inbox moved to the top right, beside What’s new, and now has Direct messages, Friends and Notifications.',
      'The sidebar has a Resources section (Discover, Scenes, Library) and lists every community you belong to.',
      'A community’s members are shown beside every page of the community, with who is online.',
      'Profiles can have a banner, a color of their own and a status line.',
      'Achievements: ten badges to earn, such as Ensemble cast for ten characters and Worldbuilder for a world with five locations. They sit on your profile.',
      'Dice are now real 3D cubes that spin and settle.',
      'WorldRoot has its book-and-roots logo.',
    ],
  },
  {
    id: '2026-10-08-new-look',
    date: '2026-10-08',
    title: 'A New Look, And Dice That Tumble',
    items: [
      'WorldRoot has a new glossy, glassy look in the cream and caramel of the WorldRoot site, in light and dark.',
      'Buttons are rounded and catch a shine. Cards and menus are glass over a softly lit page.',
      'Headings use a clean sans-serif. Story text keeps its serif for comfortable reading.',
      'Rolling dice now shows them tumbling before they land on the result.',
      'If your device asks for less motion or less transparency, WorldRoot follows it.',
    ],
  },
  {
    id: '2026-10-08-demo-dungeon',
    date: '2026-10-08',
    title: 'Demo Dungeon: A D&D Demo Community',
    items: [
      'A second demo community, Demo Dungeon, has DnD mode switched on.',
      'It comes with a small adventuring region, a Dungeon Master, a sample fighter, and character fields for class, level and background.',
      'Read “The Sealed Door” to see dice rolls in a story, then add a character and answer the notice at the inn.',
    ],
  },
  {
    id: '2026-10-08-dnd-mode',
    date: '2026-10-08',
    title: 'DnD Mode: Dice In Scenes',
    items: [
      'A community’s admins can switch on DnD mode in Settings.',
      'In that community’s scenes, writers can roll dice as themselves or as a character: d20, 2d6, 3d8+2 and so on, with a note saying what the roll is for.',
      'WorldRoot makes the roll and records it in the story. A roll cannot be edited.',
    ],
  },
  {
    id: '2026-10-08-pictures',
    date: '2026-10-08',
    title: 'Profile Pictures And Character Portraits',
    items: [
      'Upload a profile picture in Settings, and a portrait for each character from its edit page.',
      'PNG, JPEG, GIF and WebP, up to 2 MB.',
      'Location, camera details and other hidden information are removed from every image before it is stored.',
      'A character’s portrait goes with it when you add it to a community.',
    ],
  },
  {
    id: '2026-10-08-rich-descriptions',
    date: '2026-10-08',
    title: 'Formatting For Characters And Worlds',
    items: [
      'A character’s appearance, personality and biography, and a world’s description, now use the same editor as scene posts: bold, italics, headings, quotes and links.',
      'What you had already written is kept exactly as it was, and becomes editable with formatting the next time you open it.',
    ],
  },
  {
    id: '2026-10-08-discover',
    date: '2026-10-08',
    title: 'Discover And Looking For RP',
    items: [
      'Discover is open. Browse and search the communities that are open to join, with how many members each has.',
      'Looking for RP is a board where you say what you would like to write: genres, one partner or a group, pace and content rating.',
      'Message a writer straight from their listing. If you share no community, it reaches them as a message request.',
      'A listing stays up for 30 days or until you take it down, and you can have three open at once.',
      'You never see listings from someone you have blocked, and they never see yours.',
    ],
  },
  {
    id: '2026-10-08-notifications',
    date: '2026-10-08',
    title: 'Notifications',
    items: [
      'The Inbox has a Notifications tab. The dot on Inbox now shows for new notifications as well as new messages.',
      'You hear when someone posts in a scene you are writing, invites you to one, or posts an announcement in a community you belong to.',
      'You also hear when a character of yours is approved or returned, when you are given a role or a badge, and when a moderator removes a post of yours.',
      'Several posts in the same scene arrive as one line, not one each.',
      'Reviewers and moderators hear when a character or a report is waiting for them.',
      'Nothing reaches you from someone you have blocked.',
    ],
  },
  {
    id: '2026-10-08-reports',
    date: '2026-10-08',
    title: 'Reporting',
    items: [
      'A Report link now sits beside other people’s posts and messages, and on profiles and characters.',
      'Choose a reason and add a note if you wish. The person you report is not told who reported them.',
      'Community moderators have a Reports section in Settings for what happens in their community.',
      'Reports about direct messages, private scenes, profiles, or possible harm go to WorldRoot staff.',
    ],
  },
  {
    id: '2026-10-08-accounts-badges-blocks',
    date: '2026-10-08',
    title: 'Account Settings, Badges, Blocking And Message Requests',
    items: [
      'Settings now has an Account tab: change your handle and password, sign out other devices, and manage who you have blocked.',
      'New badges. WorldRoot staff have a filled Staff badge; a community’s own owner, admins and moderators have an outlined one in the community’s color, shown only inside it.',
      'More badges: Founder, Premium, Early supporter and Beta tester.',
      'Block someone from their profile. Neither of you can message the other or invite the other to a private scene, and they are not told.',
      'A first message from someone you share no community with now arrives as a request you can accept or decline.',
      'WorldRoot can be installed as an app from your browser’s menu.',
    ],
  },
  {
    id: '2026-10-08-profiles',
    date: '2026-10-08',
    title: 'Profiles',
    items: [
      'Every writer now has a profile page with their name, pronouns, an about section, their characters and their communities.',
      'Edit yours from the account menu: display name, pronouns and what you like to write.',
      'Names across WorldRoot now link to profiles, and each profile has a Message button.',
      'A new privacy setting, Appear offline, keeps you out of the online list in community lounges.',
    ],
  },
  {
    id: '2026-10-08-staff-badge',
    date: '2026-10-08',
    title: 'Staff Badge',
    items: ['WorldRoot staff now carry a badge beside their name in chats, messages, scenes and member lists.'],
  },
  {
    id: '2026-10-08-varrowmere-archive',
    date: '2026-10-08',
    title: 'Varrowmere, And Archiving Communities',
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
    title: 'World Templates',
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
    title: 'Share A World By ID',
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
    title: 'The Lounge Is Now A Chat Room',
    items: [
      'Each community lounge is a live chat room that follows the conversation as it moves.',
      'A member list beside the chat shows who is online right now.',
      'Messages from the same person are grouped, with a divider between days.',
    ],
  },
  {
    id: '2026-10-07-messaging',
    date: '2026-10-07',
    title: 'Messages, Announcements And The Lounge',
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
    title: 'Invite Links And Bans',
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
    title: 'Create And Run A Community',
    items: [
      'Create your own community from the Create menu or the Communities page.',
      'A Settings tab for owners and staff: name, about, rules, accent color, and who can find it.',
      'Build custom roles from a list of permissions, and give them to members.',
      'Define the fields every character is asked for, and switch on character review.',
      'Add worlds from your library, remove members, and read the audit log.',
    ],
  },
  {
    id: '2026-10-07-live-and-edit',
    date: '2026-10-07',
    title: 'Live Scenes, Editing And Removing Posts',
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
    title: 'What’s New Menu',
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
    title: 'Characters, Worlds And Locations',
    items: [
      'Create and edit characters in your Library. Only a name is required.',
      'Create worlds and build their locations, nested as deep as five levels.',
      'Add one of your characters to a community, filling in the fields it asks for.',
    ],
  },
  {
    id: '2026-10-07-demo',
    date: '2026-10-07',
    title: 'Demo Community',
    items: ['A sample community with a world, characters and scenes to explore. Find it under Communities.'],
  },
  {
    id: '2026-10-07-foundations',
    date: '2026-10-07',
    title: 'Accounts And Themes',
    items: ['Sign up, choose your handle, and switch between light, dark and system themes from the account menu.'],
  },
];
