/**
 * The WorldRoot rich text document: a deliberately small subset of the
 * ProseMirror JSON the editor produces. This file is the single definition of
 * what a document may contain. The browser editor is configured to produce
 * only this, and the server accepts only this, whatever a client sends.
 */

export type Mark = { type: 'bold' } | { type: 'italic' } | { type: 'strike' } | { type: 'link'; attrs: { href: string } };

export type InlineNode = { type: 'text'; text: string; marks?: Mark[] } | { type: 'hardBreak' };

export type BlockNode =
  | { type: 'paragraph'; content?: InlineNode[] }
  | { type: 'heading'; attrs: { level: 2 | 3 }; content?: InlineNode[] }
  | { type: 'blockquote'; content: BlockNode[] }
  | { type: 'horizontalRule' };

export interface RichDoc {
  type: 'doc';
  content: BlockNode[];
}

export const EMPTY_DOC: RichDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

export class InvalidDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDocumentError';
  }
}

const MAX_BLOCKS = 2_000;
const MAX_QUOTE_DEPTH = 3;
const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function parseMarks(value: unknown): Mark[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new InvalidDocumentError('Marks must be a list.');
  const marks: Mark[] = [];
  for (const mark of value) {
    if (!isRecord(mark)) throw new InvalidDocumentError('A mark must be an object.');
    if (mark.type === 'bold' || mark.type === 'italic' || mark.type === 'strike') {
      marks.push({ type: mark.type });
    } else if (mark.type === 'link') {
      const href = isRecord(mark.attrs) ? mark.attrs.href : undefined;
      // A link with an unsafe or missing address is dropped; its text is kept.
      if (typeof href === 'string' && SAFE_LINK.test(href) && href.length <= 2_000) marks.push({ type: 'link', attrs: { href } });
    } else {
      throw new InvalidDocumentError(`Unknown mark "${String(mark.type)}".`);
    }
  }
  return marks.length > 0 ? marks : undefined;
}

function parseInline(value: unknown): InlineNode[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new InvalidDocumentError('Inline content must be a list.');
  const nodes: InlineNode[] = [];
  for (const node of value) {
    if (!isRecord(node)) throw new InvalidDocumentError('An inline node must be an object.');
    if (node.type === 'hardBreak') {
      nodes.push({ type: 'hardBreak' });
    } else if (node.type === 'text') {
      if (typeof node.text !== 'string') throw new InvalidDocumentError('Text must be a string.');
      if (node.text.length === 0) continue;
      const marks = parseMarks(node.marks);
      nodes.push(marks ? { type: 'text', text: node.text, marks } : { type: 'text', text: node.text });
    } else {
      throw new InvalidDocumentError(`Unknown inline node "${String(node.type)}".`);
    }
  }
  return nodes.length > 0 ? nodes : undefined;
}

function parseBlocks(value: unknown, depth: number, counter: { blocks: number }): BlockNode[] {
  if (!Array.isArray(value)) throw new InvalidDocumentError('Block content must be a list.');
  const blocks: BlockNode[] = [];
  for (const node of value) {
    if (!isRecord(node)) throw new InvalidDocumentError('A block must be an object.');
    counter.blocks += 1;
    if (counter.blocks > MAX_BLOCKS) throw new InvalidDocumentError('The document is too long.');

    if (node.type === 'paragraph') {
      const content = parseInline(node.content);
      blocks.push(content ? { type: 'paragraph', content } : { type: 'paragraph' });
    } else if (node.type === 'heading') {
      const level = isRecord(node.attrs) && node.attrs.level === 3 ? 3 : 2;
      const content = parseInline(node.content);
      blocks.push(content ? { type: 'heading', attrs: { level }, content } : { type: 'heading', attrs: { level } });
    } else if (node.type === 'blockquote') {
      if (depth >= MAX_QUOTE_DEPTH) throw new InvalidDocumentError('Quotes are nested too deeply.');
      blocks.push({ type: 'blockquote', content: parseBlocks(node.content ?? [], depth + 1, counter) });
    } else if (node.type === 'horizontalRule') {
      blocks.push({ type: 'horizontalRule' });
    } else {
      throw new InvalidDocumentError(`Unknown block "${String(node.type)}".`);
    }
  }
  return blocks;
}

/**
 * Checks untrusted input against the schema and returns a clean copy holding
 * only known nodes and attributes. Throws InvalidDocumentError otherwise.
 */
export function parseDoc(input: unknown): RichDoc {
  if (!isRecord(input) || input.type !== 'doc') throw new InvalidDocumentError('Not a document.');
  return { type: 'doc', content: parseBlocks(input.content ?? [], 0, { blocks: 0 }) };
}

/** Builds a document from plain text: blank lines separate paragraphs, single line breaks are kept. */
export function docFromText(text: string): RichDoc {
  const paragraphs = text.replace(/\r\n?/g, '\n').split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  return {
    type: 'doc',
    content: paragraphs.map((paragraph) => ({
      type: 'paragraph',
      content: paragraph.split('\n').flatMap((line, index): InlineNode[] => {
        const text: InlineNode[] = line ? [{ type: 'text', text: line }] : [];
        return index === 0 ? text : [{ type: 'hardBreak' }, ...text];
      }),
    })),
  };
}
