import { InvalidDocumentError, isBlank, parseDoc, renderHtml, toPlainText, type RichDoc } from '@worldroot/editor';
import { DomainError } from './errors';

/** The long fields of a character that may carry formatting. */
export const CHARACTER_RICH_FIELDS = ['appearance', 'personality', 'biography'] as const;
/** The long fields of a world that may carry formatting. */
export const WORLD_RICH_FIELDS = ['description'] as const;

const MAX_CHARACTERS = 20_000;

/**
 * Separates formatted fields from the rest of a form's input. Each named
 * field may arrive as plain text or as a rich text document. A document is
 * checked against the allowlist, kept in `docs`, and replaced in the input by
 * its plain text, so the text column always holds a readable copy for search,
 * cards and reports. A field sent as plain text has no document.
 */
export function takeRichFields(input: unknown, keys: readonly string[]): { input: unknown; docs: Record<string, RichDoc> } {
  if (typeof input !== 'object' || input === null) return { input, docs: {} };
  const plain: Record<string, unknown> = { ...(input as Record<string, unknown>) };
  const docs: Record<string, RichDoc> = {};
  const errors: Record<string, string> = {};

  for (const key of keys) {
    const value = plain[key];
    if (typeof value !== 'object' || value === null) continue;
    try {
      const doc = parseDoc(value);
      if (isBlank(doc)) {
        plain[key] = null;
        continue;
      }
      const text = toPlainText(doc);
      if (text.length > MAX_CHARACTERS) {
        errors[key] = `Use at most ${MAX_CHARACTERS.toLocaleString('en')} characters.`;
        continue;
      }
      plain[key] = text;
      docs[key] = doc;
    } catch (error) {
      if (!(error instanceof InvalidDocumentError)) throw error;
      errors[key] = 'That formatting is not supported.';
    }
  }
  if (Object.keys(errors).length > 0) throw new DomainError('invalid_input', 'Check the highlighted fields.', { fields: errors });
  return { input: plain, docs };
}

/**
 * Safe HTML for one formatted field, or null when it has no document and its
 * plain text should be shown instead. The stored document is checked again on
 * the way out, so nothing reaches a page that the allowlist would refuse.
 */
export function renderRichField(docs: unknown, key: string): string | null {
  const value = typeof docs === 'object' && docs !== null ? (docs as Record<string, unknown>)[key] : undefined;
  if (!value) return null;
  try {
    const doc = parseDoc(value);
    return isBlank(doc) ? null : renderHtml(doc);
  } catch {
    return null;
  }
}
