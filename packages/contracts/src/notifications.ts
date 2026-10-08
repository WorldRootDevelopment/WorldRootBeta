/**
 * The kinds of notification. `line` writes the sentence shown in the Inbox
 * from who was involved, how many times, and what it was about.
 */
interface NotificationDefinition {
  line: (who: string, count: number, subject: string) => string;
}

const times = (count: number, one: string, many: string) => (count === 1 ? one : many.replace('{n}', String(count)));

export const NOTIFICATION_TYPES = {
  'scene.post': { line: (who, count, subject) => `${who} posted ${times(count, '', '{n} times ')}in ${subject}`.replace('  ', ' ') },
  'scene.invite': { line: (who, _count, subject) => `${who} invited you to the scene ${subject}` },
  'post.removed': { line: (_who, count, subject) => `A moderator removed ${times(count, 'one of your posts', '{n} of your posts')} in ${subject}` },
  'character.approved': { line: (_who, _count, subject) => `${subject} was approved and can now join scenes` },
  'character.returned': { line: (_who, _count, subject) => `${subject} was returned to you by a reviewer` },
  'character.pending': { line: (_who, count, subject) => `${times(count, 'A character is', '{n} characters are')} waiting for review in ${subject}` },
  announcement: { line: (who, count, subject) => `${who} posted ${times(count, 'an announcement', '{n} announcements')} in ${subject}` },
  'role.assigned': { line: (_who, _count, subject) => `You were given a new role in ${subject}` },
  'report.new': { line: (_who, count, subject) => `${times(count, 'A new report is', '{n} new reports are')} waiting in ${subject}` },
  'badge.granted': { line: (_who, _count, subject) => `You have a new badge: ${subject}` },
} as const satisfies Record<string, NotificationDefinition>;

export type NotificationType = keyof typeof NOTIFICATION_TYPES;

/** "Thea", "Thea and Marcus", or "Thea, Marcus and 3 others". */
export function namePeople(actors: readonly string[], count: number): string {
  if (actors.length === 0) return 'Someone';
  if (actors.length === 1) return actors[0]!;
  if (actors.length === 2) return `${actors[0]} and ${actors[1]}`;
  const others = Math.max(1, count - 2);
  return `${actors[0]}, ${actors[1]} and ${others} ${others === 1 ? 'other' : 'others'}`;
}

/** The sentence for a notification. Unknown types, from a newer version, fall back to their subject. */
export function notificationLine(type: string, actors: readonly string[], count: number, subject: string): string {
  const definition = (NOTIFICATION_TYPES as Record<string, NotificationDefinition>)[type];
  return definition ? definition.line(namePeople(actors, actors.length), count, subject).replace(/\s+/g, ' ').trim() : subject;
}
