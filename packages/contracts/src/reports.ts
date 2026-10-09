/**
 * Why something is being reported. `escalate` categories always reach
 * WorldRoot staff as well as the community's own reviewers, because they
 * describe possible harm to a person or a breach of the law.
 */
export const REPORT_CATEGORIES = {
  harassment: { label: 'Harassment Or Bullying', escalate: false },
  spam: { label: 'Spam Or Advertising', escalate: false },
  content_rating: { label: 'Wrong Content Rating Or Missing Warning', escalate: false },
  boundaries: { label: 'Ignoring A Writer’s Stated Boundaries', escalate: false },
  impersonation: { label: 'Pretending To Be Someone Else', escalate: false },
  minor_safety: { label: 'A Child May Be At Risk', escalate: true },
  threat: { label: 'A Threat, Or Someone May Be In Danger', escalate: true },
  illegal: { label: 'Something Illegal', escalate: true },
  other: { label: 'Something Else', escalate: false },
} as const;

export type ReportCategory = keyof typeof REPORT_CATEGORIES;

export const REPORT_CATEGORY_KEYS = Object.keys(REPORT_CATEGORIES) as ReportCategory[];

export const isReportCategory = (value: unknown): value is ReportCategory => typeof value === 'string' && value in REPORT_CATEGORIES;

export const REPORT_TARGETS = ['scene_post', 'message', 'profile', 'character', 'lfrp'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const MAX_REPORT_NOTE = 1_000;
