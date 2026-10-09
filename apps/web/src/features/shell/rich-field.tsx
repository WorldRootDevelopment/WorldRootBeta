'use client';

import { docFromText, parseDoc, type RichDoc } from '@worldroot/editor';
import { RichTextEditor } from '@worldroot/editor/react';
import { useState, type ReactNode } from 'react';

/** The document a formatted field starts from: its saved document, or its older plain text turned into paragraphs. */
export function startingDoc(docs: unknown, field: string, text: string | null | undefined): RichDoc {
  const saved = typeof docs === 'object' && docs !== null ? (docs as Record<string, unknown>)[field] : undefined;
  if (saved) {
    try {
      return parseDoc(saved);
    } catch {
      // Fall through to the plain text.
    }
  }
  return docFromText(text ?? '');
}

/**
 * Holds the documents of a form's formatted fields. Every field is present
 * from the start, so saving a form never drops a field nobody touched.
 */
export function useRichFields(fields: readonly string[], docs: unknown, text: (field: string) => string | null | undefined) {
  const [values, setValues] = useState<Record<string, RichDoc>>(() => Object.fromEntries(fields.map((field) => [field, startingDoc(docs, field, text(field))])));
  const set = (field: string, doc: RichDoc) => setValues((held) => ({ ...held, [field]: doc }));
  return { values, set };
}

interface RichFieldProps {
  label: string;
  initial: RichDoc;
  onChange: (doc: RichDoc) => void;
  hint?: ReactNode;
  error?: string;
  minHeight?: string;
}

/** A labeled rich text editor for a long field, matching the plain text areas beside it. */
export function RichField({ label, initial, onChange, hint, error, minHeight = '8rem' }: RichFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <RichTextEditor label={label} initial={initial} onChange={onChange} placeholder="" minHeight={minHeight} />
      {hint ? <p className="text-sm text-ink-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
