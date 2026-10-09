import { renderRichField } from '@worldroot/core';
import { cn } from '@worldroot/ui';
import { Prose } from './prose';

interface RichTextProps {
  /** The record's formatted documents, keyed by field name. */
  docs: unknown;
  field: string;
  /** The field's plain text, shown when it has no formatted document. */
  text: string;
  className?: string;
}

/** A long field of a character or world: formatted when it was written in the editor, plain otherwise. */
export function RichText({ docs, field, text, className }: RichTextProps) {
  const html = renderRichField(docs, field);
  if (!html) return <Prose text={text} className={className} />;
  // The HTML is produced on the server from the allowlisted document, never from anything a browser sent as markup.
  return <div className={cn('wr-prose max-w-[68ch]', className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
