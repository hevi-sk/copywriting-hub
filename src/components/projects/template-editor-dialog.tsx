'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface TemplateEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; prompt: string }) => void;
  onDelete?: () => void;
  initial?: { name: string; prompt: string } | null;
  title: string;
  promptLabel?: string;
  promptPlaceholder?: string;
}

export function TemplateEditorDialog({
  open,
  onClose,
  onSave,
  onDelete,
  initial,
  title,
  promptLabel = 'Prompt',
  promptPlaceholder = 'Enter the prompt text...',
}: TemplateEditorDialogProps) {
  const [name, setName] = useState(initial?.name || '');
  const [prompt, setPrompt] = useState(initial?.prompt || '');

  function handleSave() {
    if (!name.trim() || !prompt.trim()) return;
    onSave({ name: name.trim(), prompt: prompt.trim() });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SEO Blog Post"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{promptLabel}</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={promptPlaceholder}
              rows={5}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <div>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete();
                    onClose();
                  }}
                  className="px-3 py-2 text-xs text-destructive hover:text-destructive/80"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-md border border-input hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!name.trim() || !prompt.trim()}
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
