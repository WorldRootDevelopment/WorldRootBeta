import type { BlockNode, InlineNode, Mark, RichDoc } from './document';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ESCAPES[char]!);

function wrap(html: string, mark: Mark): string {
  switch (mark.type) {
    case 'bold':
      return `<strong>${html}</strong>`;
    case 'italic':
      return `<em>${html}</em>`;
    case 'strike':
      return `<s>${html}</s>`;
    case 'link':
      return `<a href="${escapeHtml(mark.attrs.href)}" rel="noopener noreferrer nofollow ugc" target="_blank">${html}</a>`;
  }
}

const inlineHtml = (nodes: InlineNode[] = []) =>
  nodes
    .map((node) => (node.type === 'hardBreak' ? '<br>' : (node.marks ?? []).reduce(wrap, escapeHtml(node.text))))
    .join('');

function blockHtml(node: BlockNode): string {
  switch (node.type) {
    case 'paragraph':
      return `<p>${inlineHtml(node.content)}</p>`;
    case 'heading':
      return `<h${node.attrs.level}>${inlineHtml(node.content)}</h${node.attrs.level}>`;
    case 'blockquote':
      return `<blockquote>${node.content.map(blockHtml).join('')}</blockquote>`;
    case 'horizontalRule':
      return '<hr>';
  }
}

/**
 * Renders a validated document to HTML. Every piece of text is escaped and
 * every tag comes from this file, so the output is safe to send to readers.
 * Pass only documents returned by `parseDoc`.
 */
export const renderHtml = (doc: RichDoc): string => doc.content.map(blockHtml).join('');

const inlineText = (nodes: InlineNode[] = []) => nodes.map((node) => (node.type === 'hardBreak' ? '\n' : node.text)).join('');

function blockText(node: BlockNode): string {
  switch (node.type) {
    case 'paragraph':
    case 'heading':
      return inlineText(node.content);
    case 'blockquote':
      return node.content.map(blockText).join('\n\n');
    case 'horizontalRule':
      return '';
  }
}

/** The document as plain text, for search, previews and length checks. */
export const toPlainText = (doc: RichDoc): string =>
  doc.content
    .map(blockText)
    .filter((text) => text.trim().length > 0)
    .join('\n\n')
    .trim();

/** True when the document holds no visible text. */
export const isBlank = (doc: RichDoc): boolean => toPlainText(doc).length === 0;
