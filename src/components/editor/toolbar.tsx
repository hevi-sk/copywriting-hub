'use client';

import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Link,
  Image,
  Quote,
  Undo,
  Redo,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  const tools = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive('bold'),
      tooltip: 'Bold',
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive('italic'),
      tooltip: 'Italic',
    },
    { type: 'separator' as const },
    {
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: editor.isActive('heading', { level: 1 }),
      tooltip: 'Heading 1',
    },
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive('heading', { level: 2 }),
      tooltip: 'Heading 2',
    },
    {
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive('heading', { level: 3 }),
      tooltip: 'Heading 3',
    },
    { type: 'separator' as const },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive('bulletList'),
      tooltip: 'Bullet List',
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive('orderedList'),
      tooltip: 'Ordered List',
    },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive('blockquote'),
      tooltip: 'Blockquote',
    },
    { type: 'separator' as const },
    {
      icon: Link,
      action: () => {
        const url = window.prompt('Enter URL');
        if (url) {
          editor.chain().focus().setLink({ href: url }).run();
        }
      },
      active: editor.isActive('link'),
      tooltip: 'Link',
    },
    {
      icon: Image,
      action: () => {
        const url = window.prompt('Enter image URL');
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      },
      active: false,
      tooltip: 'Image',
    },
    { type: 'separator' as const },
    {
      icon: Undo,
      action: () => editor.chain().focus().undo().run(),
      active: false,
      tooltip: 'Undo',
    },
    {
      icon: Redo,
      action: () => editor.chain().focus().redo().run(),
      active: false,
      tooltip: 'Redo',
    },
  ];

  return (
    <div className="flex items-center gap-0.5 p-2 border-b flex-wrap">
      {tools.map((tool, i) => {
        if ('type' in tool && tool.type === 'separator') {
          return (
            <div
              key={`sep-${i}`}
              className="w-px h-6 bg-border mx-1"
            />
          );
        }
        const Tool = tool as {
          icon: any;
          action: () => void;
          active: boolean;
          tooltip: string;
        };
        return (
          <button
            key={Tool.tooltip}
            onClick={Tool.action}
            title={Tool.tooltip}
            className={cn(
              'p-1.5 rounded hover:bg-muted transition-colors',
              Tool.active && 'bg-muted text-foreground'
            )}
          >
            <Tool.icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
