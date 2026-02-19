'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeoFieldsProps {
  seoTitle: string;
  seoDescription: string;
  onSeoTitleChange: (value: string) => void;
  onSeoDescriptionChange: (value: string) => void;
  onGenerate: () => Promise<void>;
  generating: boolean;
}

export function SeoFields({
  seoTitle,
  seoDescription,
  onSeoTitleChange,
  onSeoDescriptionChange,
  onGenerate,
  generating,
}: SeoFieldsProps) {
  const [copiedField, setCopiedField] = useState<'title' | 'desc' | null>(null);

  const titleLen = seoTitle.length;
  const descLen = seoDescription.length;

  const titleOk = titleLen > 0 && titleLen <= 60;
  const descOk = descLen >= 140 && descLen <= 155;

  function copyToClipboard(text: string, field: 'title' | 'desc') {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">SEO Metadata</h3>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {generating ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              Generate SEO
            </>
          )}
        </button>
      </div>

      {/* SEO Title */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            SEO Title
          </label>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-[10px] font-medium',
                titleLen === 0
                  ? 'text-muted-foreground'
                  : titleOk
                    ? 'text-green-600'
                    : 'text-red-500'
              )}
            >
              {titleLen}/60
            </span>
            {seoTitle && (
              <button
                onClick={() => copyToClipboard(seoTitle, 'title')}
                className="p-0.5 text-muted-foreground hover:text-foreground"
                title="Copy"
              >
                {copiedField === 'title' ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
        </div>
        <input
          type="text"
          value={seoTitle}
          onChange={(e) => onSeoTitleChange(e.target.value)}
          placeholder="SEO title will be generated automatically..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
        />
        {titleLen > 60 && (
          <p className="text-[10px] text-red-500">
            Title is too long. Google will truncate it after ~60 characters.
          </p>
        )}
      </div>

      {/* SEO Description */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            SEO Description
          </label>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-[10px] font-medium',
                descLen === 0
                  ? 'text-muted-foreground'
                  : descOk
                    ? 'text-green-600'
                    : descLen > 155
                      ? 'text-red-500'
                      : 'text-yellow-600'
              )}
            >
              {descLen}/155
            </span>
            {seoDescription && (
              <button
                onClick={() => copyToClipboard(seoDescription, 'desc')}
                className="p-0.5 text-muted-foreground hover:text-foreground"
                title="Copy"
              >
                {copiedField === 'desc' ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
        </div>
        <textarea
          value={seoDescription}
          onChange={(e) => onSeoDescriptionChange(e.target.value)}
          placeholder="SEO description will be generated automatically..."
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none resize-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
        />
        {descLen > 155 && (
          <p className="text-[10px] text-red-500">
            Description is too long. Google will truncate it after ~155 characters.
          </p>
        )}
        {descLen > 0 && descLen < 140 && (
          <p className="text-[10px] text-yellow-600">
            Description is short. Aim for 140-155 characters for best results.
          </p>
        )}
      </div>

      {/* Google Preview */}
      {(seoTitle || seoDescription) && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Google Preview
          </p>
          <div className="rounded-md border bg-white p-3 space-y-0.5">
            <p className="text-[13px] text-blue-700 font-medium leading-tight truncate">
              {seoTitle || 'Page Title'}
            </p>
            <p className="text-[11px] text-green-700">
              example.com/blog/...
            </p>
            <p className="text-[12px] text-gray-600 leading-snug line-clamp-2">
              {seoDescription || 'Page description will appear here...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
