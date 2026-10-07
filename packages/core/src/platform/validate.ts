import type { z } from 'zod';
import { DomainError } from './errors';

/** Parses untrusted input, or throws `invalid_input` with one message per field. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) fields[String(issue.path[0] ?? 'form')] ??= issue.message;
  throw new DomainError('invalid_input', 'Check the highlighted fields.', { fields });
}

/** A URL-safe slug from a name: lowercase letters, numbers and single hyphens. */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '');
}
