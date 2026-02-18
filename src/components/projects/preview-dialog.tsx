'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PreviewDialogProps {
  open: boolean;
  onClose: () => void;
  html: string;
  title?: string;
}

export function PreviewDialog({ open, onClose, html, title }: PreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-3 border-b bg-muted/30">
          <DialogTitle className="text-sm font-medium">{title || 'Preview'}</DialogTitle>
        </DialogHeader>

        {/* Preview content */}
        <div className="overflow-y-auto max-h-[calc(90vh-60px)]">
          <article className="max-w-3xl mx-auto px-8 py-10">
            <div
              className="preview-content"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
}
