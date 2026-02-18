'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useState, useEffect, useCallback, useRef } from 'react';
import { EditorToolbar } from './toolbar';
import { AIBubbleMenu } from './ai-bubble-menu';
import { Sparkles, Code, Eye, Columns, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'visual' | 'html' | 'split';

interface TiptapEditorProps {
  content: string;
  onChange?: (html: string) => void;
  onSave?: (html: string) => void;
  projectType?: 'blog' | 'presell';
  brandName?: string;
  editable?: boolean;
}

export function TiptapEditor({
  content,
  onChange,
  onSave,
  projectType = 'blog',
  brandName,
  editable = true,
}: TiptapEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('visual');
  const [htmlCode, setHtmlCode] = useState(content);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>(
    'saved'
  );
  const [continuing, setContinuing] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension.configure({ inline: false, allowBase64: true }),
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: 'Start writing or generate content...',
      }),
      CharacterCount,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setHtmlCode(html);
      onChange?.(html);
      setSaveStatus('unsaved');

      // Debounced auto-save
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (onSave) {
          setSaveStatus('saving');
          onSave(html);
          setSaveStatus('saved');
        }
      }, 2000);
    },
  });

  // Sync external content changes (e.g., from streaming)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
      setHtmlCode(content);
    }
  }, [content, editor]);

  function handleHtmlChange(newHtml: string) {
    setHtmlCode(newHtml);
    editor?.commands.setContent(newHtml, false);
    onChange?.(newHtml);
  }

  async function handleContinueWriting() {
    if (!editor || continuing) return;
    setContinuing(true);

    try {
      const currentContent = editor.getHTML();
      const lastChars = currentContent.slice(-500);

      const res = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_type: projectType,
          title: '',
          topic: '',
          keywords: [],
          template_html: '',
          language: 'sk',
          custom_prompt: `Continue writing this ${projectType} naturally from where it left off. Write 2-3 paragraphs. Here is the end of the current content:\n\n${lastChars}`,
          brand_name: brandName,
        }),
      });

      if (res.ok) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value, { stream: true });
          }
        }

        if (accumulated) {
          editor.commands.insertContent(accumulated);
        }
      }
    } catch (error) {
      console.error('Continue writing failed:', error);
    }

    setContinuing(false);
  }

  const charCount = editor?.storage.characterCount.characters() || 0;
  const wordCount = editor?.storage.characterCount.words() || 0;

  return (
    <div className="rounded-lg border bg-card">
      {/* View Mode Tabs */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('visual')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
              viewMode === 'visual'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            Visual
          </button>
          <button
            onClick={() => setViewMode('html')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
              viewMode === 'html'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <Code className="h-3.5 w-3.5" />
            HTML
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
              viewMode === 'split'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <Columns className="h-3.5 w-3.5" />
            Split
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
          <span
            className={cn(
              saveStatus === 'saving' && 'text-yellow-600',
              saveStatus === 'saved' && 'text-green-600',
              saveStatus === 'unsaved' && 'text-muted-foreground'
            )}
          >
            {saveStatus === 'saving'
              ? 'Saving...'
              : saveStatus === 'saved'
                ? 'Saved'
                : 'Unsaved changes'}
          </span>
        </div>
      </div>

      {/* Toolbar (visual and split modes) */}
      {viewMode !== 'html' && <EditorToolbar editor={editor} />}

      {/* Editor Content */}
      <div
        className={cn(
          viewMode === 'split' && 'grid grid-cols-2 divide-x'
        )}
      >
        {/* Visual Editor */}
        {(viewMode === 'visual' || viewMode === 'split') && (
          <div className="tiptap-editor">
            {editor && <AIBubbleMenu editor={editor} brandName={brandName} />}
            <EditorContent editor={editor} />
          </div>
        )}

        {/* HTML Editor */}
        {(viewMode === 'html' || viewMode === 'split') && (
          <textarea
            value={htmlCode}
            onChange={(e) => handleHtmlChange(e.target.value)}
            className="w-full min-h-[400px] p-4 font-mono text-sm bg-muted/30 outline-none resize-none"
            spellCheck={false}
          />
        )}
      </div>

      {/* Continue Writing Button */}
      {editable && (
        <div className="border-t p-3 flex items-center justify-between">
          <button
            onClick={handleContinueWriting}
            disabled={continuing}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-muted rounded-md hover:bg-muted/80 disabled:opacity-50"
          >
            {continuing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {continuing ? 'Writing...' : 'Continue Writing'}
          </button>
        </div>
      )}
    </div>
  );
}
