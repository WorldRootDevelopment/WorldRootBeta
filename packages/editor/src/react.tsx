'use client';

import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { ReactNode } from 'react';
import type { RichDoc } from './document';

/**
 * The extensions that make the browser editor produce exactly the document
 * schema in ./document.ts. Anything added here must be added there too.
 */
const extensions = (placeholder: string) => [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] },
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    code: false,
    codeBlock: false,
    underline: false,
  }),
  Placeholder.configure({ placeholder }),
];

interface ToolProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function Tool({ label, active = false, disabled = false, onClick, children }: ToolProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      // Keeps the selection in the text while a tool is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={
        'inline-flex size-9 items-center justify-center rounded-md text-sm disabled:opacity-40 ' +
        'focus-visible:outline-2 focus-visible:outline-focus ' +
        (active ? 'bg-accent-soft text-accent-text' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink')
      }
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      strike: current.isActive('strike'),
      heading: current.isActive('heading'),
      quote: current.isActive('blockquote'),
      link: current.isActive('link'),
    }),
  });

  const setLink = () => {
    if (state.link) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const href = window.prompt('Link address', 'https://');
    if (href && /^(https?:\/\/|mailto:)/i.test(href)) editor.chain().focus().setLink({ href }).run();
  };

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1">
      <Tool label="Bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <span className="font-bold">B</span>
      </Tool>
      <Tool label="Italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <span className="font-serif italic">I</span>
      </Tool>
      <Tool label="Strikethrough" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <span className="line-through">S</span>
      </Tool>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
      <Tool label="Heading" active={state.heading} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <span className="font-display font-semibold">H</span>
      </Tool>
      <Tool label="Quote" active={state.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <span className="font-serif text-lg leading-none">&ldquo;</span>
      </Tool>
      <Tool label="Scene break" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <span aria-hidden="true">&mdash;</span>
      </Tool>
      <Tool label={state.link ? 'Remove link' : 'Link'} active={state.link} onClick={setLink}>
        <span className="underline">a</span>
      </Tool>
    </div>
  );
}

export interface RichTextEditorProps {
  /** The starting document. Later changes to this prop are ignored; the editor owns its content. */
  initial?: RichDoc | null;
  onChange: (doc: RichDoc) => void;
  placeholder?: string;
  /** An accessible name for the writing area. */
  label: string;
  /** Called with the live editor, for callers that need to clear or focus it. */
  onReady?: (editor: Editor) => void;
  minHeight?: string;
}

/** The WorldRoot writing surface. Return always makes a new line; nothing is sent until the caller posts. */
export function RichTextEditor({ initial, onChange, placeholder = 'Write…', label, onReady, minHeight = '10rem' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: extensions(placeholder),
    content: initial ?? undefined,
    // Rendered on the client only, so server and browser markup cannot disagree.
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'wr-prose wr-editor', role: 'textbox', 'aria-multiline': 'true', 'aria-label': label },
    },
    onCreate: ({ editor: created }) => onReady?.(created),
    onUpdate: ({ editor: updated }) => onChange(updated.getJSON() as RichDoc),
  });

  return (
    <div className="rounded-xl border border-line-strong bg-surface-raised focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-focus">
      {editor ? <Toolbar editor={editor} /> : <div className="h-[2.875rem] border-b border-line" />}
      <div className="px-4 py-3" style={{ minHeight }} onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export type { Editor };
