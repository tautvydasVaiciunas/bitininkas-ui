import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        codeBlock: false,
        hardBreak: false,
        heading: false,
        horizontalRule: false,
        image: false,
        listItem: false,
        orderedList: false,
        taskList: false,
      }),
      Underline,
      Placeholder.configure({ placeholder: placeholder ?? 'Parašykite naujienos tekstą' }),
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class: 'focus-visible:outline-none min-h-[160px] w-full',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    const target = value && value.trim() ? value : '<p></p>';
    if (editor.getHTML() !== target) {
      editor.commands.setContent(target, false);
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={editor.isActive('bold') ? 'secondary' : 'outline'}
          size="sm"
          className={clsx('h-9 w-9 px-0 font-semibold', editor.isActive('bold') ? 'border-transparent' : '')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Paryškinti"
        >
          B
        </Button>
        <Button
          type="button"
          variant={editor.isActive('italic') ? 'secondary' : 'outline'}
          size="sm"
          className={clsx('h-9 w-9 px-0 italic', editor.isActive('italic') ? 'border-transparent' : '')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Kursyvas"
        >
          I
        </Button>
        <Button
          type="button"
          variant={editor.isActive('underline') ? 'secondary' : 'outline'}
          size="sm"
          className={clsx('h-9 w-9 px-0 font-semibold', editor.isActive('underline') ? 'border-transparent' : '')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Pabraukimas"
        >
          <span className="inline-block border-b-2 border-current">U</span>
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-card/50">
        <EditorContent editor={editor} className="min-h-[140px] px-3 py-2" />
      </div>
    </div>
  );
}
