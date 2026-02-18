'use client';

import { useState } from 'react';
import type { LanguageCode, Project } from '@/types';
import { LANGUAGES } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { Copy, Download, Languages, Loader2, X } from 'lucide-react';

interface ExportDialogProps {
  project: Project;
  open: boolean;
  onClose: () => void;
  onTranslated: (lang: LanguageCode, html: string) => void;
}

export function ExportDialog({
  project,
  open,
  onClose,
  onTranslated,
}: ExportDialogProps) {
  const { toast } = useToast();
  const [translating, setTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState<LanguageCode>('cs');
  const [viewLang, setViewLang] = useState<string>('original');

  if (!open) return null;

  function getCleanHtml(html: string): string {
    // Strip editor-specific attributes
    return html
      .replace(/\s*data-\w+="[^"]*"/g, '')
      .replace(/\s*class="[^"]*"/g, '')
      .replace(/\s*contenteditable="[^"]*"/g, '')
      .trim();
  }

  function getExportHtml(): string {
    if (viewLang === 'original') {
      return getCleanHtml(project.content_html || '');
    }
    const translated =
      project.translated_versions?.[viewLang as LanguageCode];
    return translated ? getCleanHtml(translated) : '';
  }

  async function handleCopyHtml() {
    const html = getExportHtml();
    await navigator.clipboard.writeText(html);
    toast({ title: 'Copied', description: 'HTML copied to clipboard.' });
  }

  function handleDownload() {
    const html = getExportHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '-').toLowerCase()}-${viewLang}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleTranslate() {
    setTranslating(true);

    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_html: project.content_html,
          source_language: project.language,
          target_language: targetLang,
        }),
      });

      const data = await res.json();
      if (data.html) {
        onTranslated(targetLang, data.html);
        toast({
          title: 'Translated',
          description: `Content translated to ${LANGUAGES[targetLang]}.`,
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Translation failed.',
        variant: 'destructive',
      });
    }

    setTranslating(false);
  }

  const availableTranslations = Object.entries(
    project.translated_versions || {}
  ).filter(([_, html]) => html);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Export & Translate</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Translate */}
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Translate
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as LanguageCode)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {(Object.entries(LANGUAGES) as [LanguageCode, string][])
                .filter(([code]) => code !== project.language)
                .map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
            </select>
            <button
              onClick={handleTranslate}
              disabled={translating}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {translating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Languages className="h-4 w-4" />
              )}
              {translating ? 'Translating...' : 'Translate'}
            </button>
          </div>

          {availableTranslations.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">
                Available:
              </span>
              {availableTranslations.map(([lang]) => (
                <span
                  key={lang}
                  className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700"
                >
                  {LANGUAGES[lang as LanguageCode] || lang}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Export */}
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-medium">Export HTML</h3>

          <div className="flex items-center gap-2">
            <select
              value={viewLang}
              onChange={(e) => setViewLang(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="original">
                Original ({LANGUAGES[project.language]})
              </option>
              {availableTranslations.map(([lang]) => (
                <option key={lang} value={lang}>
                  {LANGUAGES[lang as LanguageCode] || lang}
                </option>
              ))}
            </select>
          </div>

          <pre className="bg-muted p-3 rounded text-xs max-h-48 overflow-auto font-mono">
            {getExportHtml() || 'No content to export'}
          </pre>

          <div className="flex gap-2">
            <button
              onClick={handleCopyHtml}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
            >
              <Copy className="h-4 w-4" />
              Copy HTML
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
            >
              <Download className="h-4 w-4" />
              Download .html
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
