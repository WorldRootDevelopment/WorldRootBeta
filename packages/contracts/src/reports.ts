/**
 * Why something is being reported. `escalate` categories always reach
 * WorldRoot staff as well as the community's own reviewers, because they
 * describe possible harm to a person or a breach of the law.
 */
export const REPORT_CATEGORIES = {
  harassment: { label: 'Harassment or bullying', escalate: false },
  spam: { label: 'Spam or advertising', escalate: false },
  content_rating: { label: 'Wrong content rating or missing warning', escalate: false },
  boundaries: { label: 'Ignoring a writer’s stated boundaries', escalate: false },
  impersonation: { label: 'Pretending to be someone else', escalate: false },
  minor_safety: { label: 'A child may be at risk', escalate: true },
  threat: { label: 'A threat, or someone may be in danger', escalate: true },
  illegal: { label: 'Something illegal', escalate: true },
  other: { label: 'Something else', escalate: false },
} as const;

export type ReportCategory = keyof typeof REPORT_CATEGORIES;

export const REPORT_CATEGORY_KEYS = Object.keys(REPORT_CATEGORIES) as ReportCategory[];

export const isReportCategory = (value: unknown): value is ReportCategory => typeof value === 'string' && value in REPORT_CATEGORIES;

export const REPORT_TARGETS = ['scene_post', 'message', 'profile', 'character'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const MAX_REPORT_NOTE = 1_000;
