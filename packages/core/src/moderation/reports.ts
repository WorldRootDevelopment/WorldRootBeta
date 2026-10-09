import {
  isReportCategory,
  MAX_REPORT_NOTE,
  REPORT_CATEGORIES,
  REPORT_TARGETS,
  type ReportCategory,
  type ReportTarget,
} from '@worldroot/contracts';
import {
  communities,
  conversations,
  lfrpListings,
  messages,
  profiles,
  reports,
  scenePosts,
  scenes,
  type Db,
  type ReportSnapshot,
} from '@worldroot/db';
import { and, count, desc, eq, isNull, or } from 'drizzle-orm';
import { getCharacterView } from '../characters/service';
import { communityGrants } from '../community/service';
import { canAccessConversation } from '../messaging/service';
import { membersWithPermission, notifyMany, staffIds } from '../notifications/service';
import { recordAudit } from '../platform/audit';
import { authorize, can, type Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { canAccessScene } from '../scenes/service';

export type Report = typeof reports.$inferSelect;

const missing = () => new DomainError('not_found', 'That cannot be found, so it cannot be reported.');
const clip = (text: string) => (text.length > 2_000 ? `${text.slice(0, 2_000)}…` : text);

interface Resolved {
  subjectUserId: string | null;
  communityId: string | null;
  snapshot: ReportSnapshot;
}

/**
 * Finds what is being reported and records what it says right now. The actor
 * must be able to see it: nobody can report, and so learn about, something
 * hidden from them.
 */
async function resolveTarget(db: Db, actor: Actor, targetType: ReportTarget, targetId: string): Promise<Resolved> {
  if (targetType === 'scene_post') {
    const [row] = await db
      .select({ post: scenePosts, scene: scenes })
      .from(scenePosts)
      .innerJoin(scenes, eq(scenes.id, scenePosts.sceneId))
      .where(eq(scenePosts.id, targetId));
    if (!row || !(await canAccessScene(db, actor, row.scene.id))) throw missing();
    return {
      subjectUserId: row.post.authorUserId,
      communityId: row.scene.communityId,
      snapshot: {
        text: clip(row.post.contentText),
        where: `${row.post.kind === 'ooc' ? 'Out-of-character message' : `Post by ${row.post.characterName ?? 'the narrator'}`} in the scene “${row.scene.title}”`,
        href: `/scenes/${row.scene.id}#post-${row.post.seq}`,
      },
    };
  }

  if (targetType === 'message') {
    const [row] = await db
      .select({ message: messages, conversation: conversations })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .where(eq(messages.id, targetId));
    if (!row || !(await canAccessConversation(db, actor, row.conversation.id))) throw missing();
    let where = row.conversation.kind === 'group' ? 'A group conversation' : 'A direct message';
    let href: string | null = null;
    if (row.conversation.kind === 'community') {
      const [community] = await db.select().from(communities).where(eq(communities.id, row.conversation.communityId!));
      where = `${row.conversation.spaceKey === 'lounge' ? 'Lounge' : 'Announcements'} of ${community?.name ?? 'a community'}`;
      href = community ? `/c/${community.slug}/${row.conversation.spaceKey}` : null;
    }
    // A private conversation is not linked: reviewers work from the snapshot, not by reading the rest of it.
    return { subjectUserId: row.message.authorUserId, communityId: row.conversation.communityId, snapshot: { text: clip(row.message.body), where, href } };
  }

  if (targetType === 'profile') {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, targetId));
    if (!profile) throw missing();
    return {
      subjectUserId: profile.userId,
      communityId: null,
      snapshot: {
        text: clip([profile.displayName, profile.pronouns, profile.bio].filter(Boolean).join('\n')),
        where: `Profile of @${profile.handle}`,
        href: `/u/${profile.handle}`,
      },
    };
  }

  if (targetType === 'lfrp') {
    const [row] = await db
      .select({ listing: lfrpListings, handle: profiles.handle })
      .from(lfrpListings)
      .innerJoin(profiles, eq(profiles.userId, lfrpListings.userId))
      .where(eq(lfrpListings.id, targetId));
    if (!row) throw missing();
    // The board belongs to no community, so these go to WorldRoot staff.
    return {
      subjectUserId: row.listing.userId,
      communityId: null,
      snapshot: { text: clip(`${row.listing.title}\n\n${row.listing.body}`), where: `Looking for RP listing by @${row.handle}`, href: '/discover/partners' },
    };
  }

  // A character. getCharacterView refuses anything the actor may not see.
  const view = await getCharacterView(db, actor, targetId).catch(() => {
    throw missing();
  });
  const { character } = view;
  return {
    subjectUserId: character.playerUserId,
    communityId: character.communityId,
    snapshot: {
      text: clip([character.name, character.tagline, character.appearance, character.personality, character.biography].filter(Boolean).join('\n\n')),
      where: `Character “${character.name}”${view.community ? ` in ${view.community.name}` : ''}`,
      href: `/characters/${character.id}`,
    },
  };
}

export interface CreateReportInput {
  targetType: unknown;
  targetId: unknown;
  category: unknown;
  note?: unknown;
}

/** Reports a post, message, profile or character. Reporting the same thing twice while it is open changes nothing. */
export async function createReport(db: Db, actor: Actor, input: CreateReportInput): Promise<Report> {
  const targetType = REPORT_TARGETS.find((type) => type === input.targetType);
  if (!targetType || typeof input.targetId !== 'string' || !input.targetId) throw new DomainError('invalid_input', 'Choose what to report.');
  if (!isReportCategory(input.category)) {
    throw new DomainError('invalid_input', 'Choose a reason.', { fields: { category: 'Choose a reason.' } });
  }
  const category: ReportCategory = input.category;
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, MAX_REPORT_NOTE) || null : null;

  const target = await resolveTarget(db, actor, targetType, input.targetId);
  if (target.subjectUserId === actor.userId) throw new DomainError('invalid_input', 'You cannot report something of your own. You can edit or remove it.');

  const [existing] = await db
    .select()
    .from(reports)
    .where(
      and(eq(reports.reporterUserId, actor.userId), eq(reports.targetType, targetType), eq(reports.targetId, input.targetId), eq(reports.status, 'open')),
    );
  if (existing) return existing;

  const [report] = await db
    .insert(reports)
    .values({
      reporterUserId: actor.userId,
      subjectUserId: target.subjectUserId,
      targetType,
      targetId: input.targetId,
      communityId: target.communityId,
      category,
      note,
      snapshot: target.snapshot,
      // Staff always see possible harm or law-breaking, and everything that has no community to review it.
      escalated: REPORT_CATEGORIES[category].escalate || !target.communityId,
    })
    .returning();

  // Reviewers are told there is something to look at, never what or by whom: that stays in the queue.
  if (target.communityId) {
    const [home] = await db.select({ name: communities.name, slug: communities.slug }).from(communities).where(eq(communities.id, target.communityId));
    await notifyMany(db, (await membersWithPermission(db, target.communityId, 'report.review')).filter((id) => id !== actor.userId), {
      type: 'report.new',
      groupKey: `community:${target.communityId}:reports`,
      subject: home?.name ?? 'a community',
      href: `/c/${home?.slug ?? ''}/settings/reports`,
    });
  }
  if (report!.escalated) {
    await notifyMany(db, (await staffIds(db)).filter((id) => id !== actor.userId), {
      type: 'report.new',
      groupKey: 'platform:reports',
      subject: 'the staff queue',
      href: '/staff',
    });
  }
  return report!;
}

export interface ReportRow {
  id: string;
  category: ReportCategory;
  note: string | null;
  snapshot: ReportSnapshot;
  targetType: string;
  escalated: boolean;
  status: Report['status'];
  resolution: string | null;
  createdAt: Date;
  /** Shown to reviewers only. The person reported is never told who reported them. */
  reporterHandle: string | null;
  subjectHandle: string | null;
  communityName: string | null;
}

/** Where a queue's reports come from: one community, or the platform queue that WorldRoot staff work. */
export type ReportScope = { communityId: string } | 'platform';

async function assertCanReview(db: Db, actor: Actor, scope: ReportScope): Promise<void> {
  if (scope === 'platform') {
    if (actor.platformRole !== 'staff') throw new DomainError('forbidden', 'Only WorldRoot staff can do that.');
  } else {
    await authorize(actor, 'report.review', scope, communityGrants(db));
  }
}

const inScope = (scope: ReportScope) =>
  scope === 'platform' ? or(eq(reports.escalated, true), isNull(reports.communityId)) : eq(reports.communityId, scope.communityId);

/** A review queue, newest first. Open reports by default; pass `handled` to see what has been dealt with. */
export async function listReports(db: Db, actor: Actor, scope: ReportScope, which: 'open' | 'handled' = 'open'): Promise<ReportRow[]> {
  await assertCanReview(db, actor, scope);
  const rows = await db
    .select({ report: reports, communityName: communities.name })
    .from(reports)
    .leftJoin(communities, eq(communities.id, reports.communityId))
    .where(and(inScope(scope), which === 'open' ? eq(reports.status, 'open') : or(eq(reports.status, 'resolved'), eq(reports.status, 'dismissed'))))
    .orderBy(desc(reports.id))
    .limit(100);
  if (rows.length === 0) return [];

  const people = await db.select({ userId: profiles.userId, handle: profiles.handle }).from(profiles);
  const handleOf = (userId: string | null) => (userId ? (people.find((person) => person.userId === userId)?.handle ?? null) : null);

  return rows.map(({ report, communityName }) => ({
    id: report.id,
    category: report.category as ReportCategory,
    note: report.note,
    snapshot: report.snapshot,
    targetType: report.targetType,
    escalated: report.escalated,
    status: report.status,
    resolution: report.resolution,
    createdAt: report.createdAt,
    reporterHandle: handleOf(report.reporterUserId),
    subjectHandle: handleOf(report.subjectUserId),
    communityName,
  }));
}

/** How many reports are waiting in a queue. Zero for anyone who may not review it. */
export async function countOpenReports(db: Db, actor: Actor, scope: ReportScope): Promise<number> {
  const allowed = scope === 'platform' ? actor.platformRole === 'staff' : await can(actor, 'report.review', scope, communityGrants(db));
  if (!allowed) return 0;
  const [row] = await db.select({ value: count() }).from(reports).where(and(inScope(scope), eq(reports.status, 'open')));
  return row?.value ?? 0;
}

/**
 * Closes a report as resolved (something was done) or dismissed (nothing
 * needed doing). A community's reviewers close their community's reports;
 * WorldRoot staff can close any.
 */
export async function handleReport(db: Db, actor: Actor, reportId: string, input: { status: unknown; resolution?: unknown }): Promise<void> {
  if (input.status !== 'resolved' && input.status !== 'dismissed') throw new DomainError('invalid_input', 'Choose resolved or dismissed.');
  const status = input.status;
  const [report] = await db.select().from(reports).where(eq(reports.id, reportId));
  if (!report) throw new DomainError('not_found', 'That report does not exist.');
  if (actor.platformRole !== 'staff') {
    // Without a community there is nobody but staff to review it. That reads as "not found" to anyone else.
    if (!report.communityId) throw new DomainError('not_found', 'That report does not exist.');
    await authorize(actor, 'report.review', { communityId: report.communityId }, communityGrants(db));
  }
  if (report.status !== 'open') return;
  const resolution = typeof input.resolution === 'string' ? input.resolution.trim().slice(0, MAX_REPORT_NOTE) || null : null;

  await db.transaction(async (tx) => {
    await tx.update(reports).set({ status, resolution, handledByUserId: actor.userId, handledAt: new Date() }).where(eq(reports.id, reportId));
    await recordAudit(tx, {
      actor,
      action: status === 'resolved' ? 'report.resolve' : 'report.dismiss',
      targetType: 'report',
      targetId: reportId,
      communityId: report.communityId,
      after: { category: report.category, resolution },
    });
  });
}
