'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { BubbleMenu, Editor } from '@tiptap/react';
import { Sparkles, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { DOMSerializer } from '@tiptap/pm/model';

interface AIBubbleMenuProps {
  editor: Editor;
  brandName?: string;
  imageStyle?: string;
}

interface SavedSelection {
  from: number;
  to: number;
  isImage: boolean;
  imageAttrs: { src: string; alt: string } | null;
  selectedText: string;
  selectedHtml: string;
  contextBefore: string;
  contextAfter: string;
}

export function AIBubbleMenu({ editor, brandName, imageStyle }: AIBubbleMenuProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const savedSelection = useRef<SavedSelection | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get the HTML of a slice of the document
  function getSelectionHtml(from: number, to: number): string {
    const slice = editor.state.doc.slice(from, to);
    const serializer = DOMSerializer.fromSchema(editor.schema);
    const fragment = serializer.serializeFragment(slice.content);
    const div = document.createElement('div');
    div.appendChild(fragment);
    return div.innerHTML;
  }

  // Capture selection info from editor before it can be lost
  const captureSelection = useCallback(() => {
    const { from, to } = editor.state.selection;
    if (from === to) return;

    let isImage = false;
    let imageAttrs: { src: string; alt: string } | null = null;
    editor.state.doc.nodesBetween(from, to, (node) => {
      if (node.type.name === 'image') {
        isImage = true;
        imageAttrs = {
          src: node.attrs.src || '',
          alt: node.attrs.alt || '',
        };
      }
    });

    // Get the actual HTML of the selection for proper context
    const selectedHtml = getSelectionHtml(from, to);
    const selectedText = editor.state.doc.textBetween(from, to, '\n');
    const fullText = editor.state.doc.textContent;
    const selStart = fullText.indexOf(selectedText);
    const contextBefore = fullText.substring(
      Math.max(0, selStart - 200),
      selStart
    );
    const contextAfter = fullText.substring(
      selStart + selectedText.length,
      selStart + selectedText.length + 200
    );

    savedSelection.current = {
      from,
      to,
      isImage,
      imageAttrs,
      selectedText,
      selectedHtml,
      contextBefore,
      contextAfter,
    };
  }, [editor]);

  // Apply/remove yellow highlight on the selected range in the DOM
  function applyHighlight(from: number, to: number) {
    removeHighlight();
    try {
      const startCoords = editor.view.coordsAtPos(from);
      const endCoords = editor.view.coordsAtPos(to);
      const domStart = editor.view.domAtPos(from);
      const domEnd = editor.view.domAtPos(to);

      const range = document.createRange();
      range.setStart(domStart.node, domStart.offset);
      range.setEnd(domEnd.node, domEnd.offset);

      const mark = document.createElement('mark');
      mark.className = 'ai-edit-highlight';
      mark.style.backgroundColor = 'rgba(250, 204, 21, 0.3)';
      mark.style.borderRadius = '2px';
      mark.dataset.aiHighlight = 'true';

      range.surroundContents(mark);
    } catch {
      // surroundContents can fail on complex selections spanning multiple nodes
      // Fall back to highlighting each text node in the range
      try {
        const walker = document.createTreeWalker(
          editor.view.dom,
          NodeFilter.SHOW_TEXT,
          null
        );
        const domStart = editor.view.domAtPos(from);
        const domEnd = editor.view.domAtPos(to);

        let inRange = false;
        const textNodes: Text[] = [];
        while (walker.nextNode()) {
          const node = walker.currentNode as Text;
          if (node === domStart.node || node.parentNode === domStart.node) inRange = true;
          if (inRange) textNodes.push(node);
          if (node === domEnd.node || node.parentNode === domEnd.node) break;
        }

        for (const textNode of textNodes) {
          const mark = document.createElement('mark');
          mark.className = 'ai-edit-highlight';
          mark.style.backgroundColor = 'rgba(250, 204, 21, 0.3)';
          mark.style.borderRadius = '2px';
          mark.dataset.aiHighlight = 'true';
          textNode.parentNode?.insertBefore(mark, textNode);
          mark.appendChild(textNode);
        }
      } catch {
        // Silently fail if even the fallback doesn't work
      }
    }
  }

  function removeHighlight() {
    const highlights = editor.view.dom.querySelectorAll('[data-ai-highlight="true"]');
    highlights.forEach((el) => {
      const parent = el.parentNode;
      while (el.firstChild) {
        parent?.insertBefore(el.firstChild, el);
      }
      parent?.removeChild(el);
    });
  }

  function handleTriggerClick() {
    // Capture selection NOW, before anything else
    captureSelection();

    // Get position for the panel from the browser selection
    const domSelection = window.getSelection();
    if (domSelection && domSelection.rangeCount > 0) {
      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setPanelPos({
        top: rect.top + window.scrollY - 10,
        left: Math.max(16, rect.left + rect.width / 2 - 160),
      });
    }

    // Apply yellow highlight
    if (savedSelection.current) {
      const { from, to } = savedSelection.current;
      setTimeout(() => applyHighlight(from, to), 10);
    }

    setPanelOpen(true);

    // Focus textarea after panel renders
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleClose() {
    removeHighlight();
    setPanelOpen(false);
    setPrompt('');
  }

  // Close on Escape
  useEffect(() => {
    if (!panelOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panelOpen]);

  // Close when clicking outside the panel
  useEffect(() => {
    if (!panelOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }
    // Use a slight delay so the trigger click doesn't immediately close
    const id = setTimeout(
      () => document.addEventListener('mousedown', onMouseDown),
      100
    );
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [panelOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading || !savedSelection.current) return;

    const sel = savedSelection.current;
    setLoading(true);

    try {
      if (sel.isImage) {
        const res = await fetch('/api/ai/regenerate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt,
            original_alt: sel.imageAttrs?.alt || '',
            image_style: imageStyle || '',
          }),
        });

        const data = await res.json();

        if (data.imageUrl) {
          editor
            .chain()
            .focus()
            .setTextSelection({ from: sel.from, to: sel.to })
            .deleteSelection()
            .setImage({
              src: data.imageUrl,
              alt: data.alt || sel.imageAttrs?.alt || '',
            })
            .run();
        }
      } else {
        const res = await fetch('/api/ai/edit-selection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selected_html: sel.selectedHtml,
            instruction: prompt,
            context_before: sel.contextBefore,
            context_after: sel.contextAfter,
            brand_name: brandName,
          }),
        });

        const data = await res.json();

        if (data.html) {
          // Replace via full document HTML to preserve structure
          const fullHtml = editor.getHTML();
          if (fullHtml.includes(sel.selectedHtml)) {
            const newHtml = fullHtml.replace(sel.selectedHtml, data.html);
            editor.commands.setContent(newHtml, false);
          } else {
            // Fallback: use selection-based replacement
            editor
              .chain()
              .focus()
              .setTextSelection({ from: sel.from, to: sel.to })
              .deleteSelection()
              .insertContent(data.html)
              .run();
          }
        }
      }

      removeHighlight();
      setPrompt('');
      setPanelOpen(false);
    } catch (error) {
      console.error('AI edit failed:', error);
      removeHighlight();
    }

    setLoading(false);
  }

  const isImage = savedSelection.current?.isImage ?? false;

  return (
    <>
      {/* Tiny trigger button that appears on selection */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{
          duration: 100,
          placement: 'top',
        }}
        shouldShow={({ state }) => {
          if (panelOpen) return false;
          const { from, to } = state.selection;
          if (from !== to && !state.selection.empty) return true;
          let hasImage = false;
          state.doc.nodesBetween(from, to, (node) => {
            if (node.type.name === 'image') hasImage = true;
          });
          return hasImage;
        }}
        className="bg-popover border rounded-lg shadow-lg"
      >
        <button
          type="button"
          onClick={handleTriggerClick}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium hover:bg-muted rounded-lg transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Edit
        </button>
      </BubbleMenu>

      {/* Floating panel (rendered via portal so it doesn't depend on BubbleMenu) */}
      {panelOpen &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: 'absolute',
              top: panelPos.top,
              left: panelPos.left,
              zIndex: 9999,
            }}
            className="w-80 -translate-y-full bg-popover border rounded-lg shadow-xl p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {isImage ? (
                  <>
                    <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                    Regenerate Image
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Edit Selection
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {!isImage && savedSelection.current?.selectedText && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 max-h-16 overflow-y-auto line-clamp-3">
                &ldquo;{savedSelection.current.selectedText.slice(0, 120)}
                {(savedSelection.current.selectedText.length ?? 0) > 120
                  ? '...'
                  : ''}
                &rdquo;
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={
                  isImage
                    ? 'Describe the image you want...'
                    : 'What should the AI change? (e.g. make it shorter, rewrite in a friendlier tone...)'
                }
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none resize-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
                disabled={loading}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter
                  to submit
                </span>
                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Working...
                    </>
                  ) : isImage ? (
                    'Regenerate'
                  ) : (
                    'Apply'
                  )}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </>
  );
}
