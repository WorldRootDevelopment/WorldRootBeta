import { describe, expect, it } from 'vitest';
import { docFromText, InvalidDocumentError, parseDoc } from './document';
import { isBlank, renderHtml, toPlainText } from './render';

const doc = (content: unknown[]) => ({ type: 'doc', content });
const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks ? { marks } : {}) });

describe('parseDoc', () => {
  it('keeps the allowed nodes and marks', () => {
    const parsed = parseDoc(
      doc([
        { type: 'heading', attrs: { level: 3 }, content: [text('The Late Train')] },
        { type: 'paragraph', content: [text('She was '), text('late', [{ type: 'italic' }]), { type: 'hardBreak' }, text('again.')] },
        { type: 'blockquote', content: [{ type: 'paragraph', content: [text('Platform four.')] }] },
        { type: 'horizontalRule' },
      ]),
    );
    expect(renderHtml(parsed)).toBe(
      '<h3>The Late Train</h3><p>She was <em>late</em><br>again.</p><blockquote><p>Platform four.</p></blockquote><hr>',
    );
  });

  it('strips attributes it does not know', () => {
    const parsed = parseDoc(doc([{ type: 'paragraph', attrs: { style: 'color:red', onclick: 'x()' }, content: [text('Hi')] }]));
    expect(parsed).toEqual(doc([{ type: 'paragraph', content: [text('Hi')] }]));
  });

  it('refuses nodes and marks outside the schema', () => {
    expect(() => parseDoc(doc([{ type: 'image', attrs: { src: 'x' } }]))).toThrow(InvalidDocumentError);
    expect(() => parseDoc(doc([{ type: 'paragraph', content: [text('x', [{ type: 'code' }])] }]))).toThrow(InvalidDocumentError);
    expect(() => parseDoc({ type: 'paragraph' })).toThrow(InvalidDocumentError);
    expect(() => parseDoc('<p>hello</p>')).toThrow(InvalidDocumentError);
  });

  it('drops unsafe links and keeps their text', () => {
    const parsed = parseDoc(
      doc([
        {
          type: 'paragraph',
          content: [
            text('click', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]),
            text(' or ', []),
            text('here', [{ type: 'link', attrs: { href: 'https://example.com/a?b="c"' } }]),
          ],
        },
      ]),
    );
    expect(renderHtml(parsed)).toBe(
      '<p>click or <a href="https://example.com/a?b=&quot;c&quot;" rel="noopener noreferrer nofollow ugc" target="_blank">here</a></p>',
    );
  });

  it('refuses quotes nested too deeply', () => {
    const nest = (depth: number): unknown => (depth === 0 ? { type: 'paragraph' } : { type: 'blockquote', content: [nest(depth - 1)] });
    expect(() => parseDoc(doc([nest(3)]))).not.toThrow();
    expect(() => parseDoc(doc([nest(4)]))).toThrow(InvalidDocumentError);
  });
});

describe('renderHtml', () => {
  it('escapes text, so markup typed into a post is shown, not run', () => {
    const parsed = parseDoc(doc([{ type: 'paragraph', content: [text('<script>alert("x")</script> & co')] }]));
    expect(renderHtml(parsed)).toBe('<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co</p>');
  });
});

describe('plain text', () => {
  it('extracts text with paragraph breaks', () => {
    const parsed = parseDoc(
      doc([
        { type: 'paragraph', content: [text('One'), { type: 'hardBreak' }, text('two')] },
        { type: 'horizontalRule' },
        { type: 'paragraph', content: [text('Three')] },
      ]),
    );
    expect(toPlainText(parsed)).toBe('One\ntwo\n\nThree');
  });

  it('knows a blank document', () => {
    expect(isBlank(parseDoc(doc([{ type: 'paragraph' }, { type: 'paragraph', content: [text('   ')] }])))).toBe(true);
    expect(isBlank(docFromText('hello'))).toBe(false);
  });

  it('round-trips plain text into a document', () => {
    const built = docFromText('First line\nsecond line\n\n\nNext paragraph');
    expect(toPlainText(parseDoc(built))).toBe('First line\nsecond line\n\nNext paragraph');
  });
});
