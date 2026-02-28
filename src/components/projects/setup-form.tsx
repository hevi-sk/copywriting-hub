'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  ProjectType,
  LanguageCode,
  Template,
  KeywordEntry,
  BrandRecord,
} from '@/types';
import { LANGUAGES, PROMPT_TEMPLATES, IMAGE_STYLES } from '@/types';
import { usePresetTemplates } from '@/hooks/use-preset-templates';
import { TemplateEditorDialog } from './template-editor-dialog';
import { Pencil } from 'lucide-react';

interface SetupFormProps {
  type: ProjectType;
  onGenerate: (data: {
    title: string;
    topic: string;
    keywords: string[];
    template_id: string;
    template_html: string;
    language: LanguageCode;
    custom_prompt: string;
    image_style: string;
    brand_id: string;
    brand_name: string;
    brand_context: string;
  }) => void;
  loading?: boolean;
}

export function SetupForm({ type, onGenerate, loading }: SetupFormProps) {
  const supabase = createClient();
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [brandId, setBrandId] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [keywords, setKeywords] = useState<KeywordEntry[]>([]);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [language, setLanguage] = useState<LanguageCode>('sk');
  const [customPrompt, setCustomPrompt] = useState('');
  const [promptTemplateId, setPromptTemplateId] = useState('');
  const [imageStyleId, setImageStyleId] = useState('');

  // Supabase-backed template stores
  const promptTemplates = usePresetTemplates('prompt_template', PROMPT_TEMPLATES);
  const imageStyles = usePresetTemplates('image_style', IMAGE_STYLES);

  // Auto-select first image style when current selection doesn't match any item
  useEffect(() => {
    if (imageStyles.items.length > 0 && !imageStyles.items.find((s) => s.id === imageStyleId)) {
      setImageStyleId(imageStyles.items[0].id);
    }
  }, [imageStyles.items, imageStyleId]);

  // Dialog state
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [promptDialogEdit, setPromptDialogEdit] = useState<string | null>(null);
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [styleDialogEdit, setStyleDialogEdit] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [templatesRes, keywordsRes, brandsRes] = await Promise.all([
      supabase
        .from('templates')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false }),
      supabase
        .from('keyword_research')
        .select('*')
        .order('volume', { ascending: false })
        .limit(50),
      supabase.from('brands').select('*').order('name'),
    ]);
    setTemplates(templatesRes.data || []);
    setKeywords(keywordsRes.data || []);
    setBrands(brandsRes.data || []);
  }

  function addKeyword() {
    if (newKeyword.trim() && !selectedKeywords.includes(newKeyword.trim())) {
      setSelectedKeywords([...selectedKeywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  }

  function removeKeyword(kw: string) {
    setSelectedKeywords(selectedKeywords.filter((k) => k !== kw));
  }

  function toggleKeywordFromBank(keyword: string) {
    if (selectedKeywords.includes(keyword)) {
      removeKeyword(keyword);
    } else {
      setSelectedKeywords([...selectedKeywords, keyword]);
    }
  }

  function handlePromptTemplateChange(id: string) {
    setPromptTemplateId(id);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const template = templates.find((t) => t.id === templateId);

    // Combine prompt template + custom prompt
    const selectedPromptTemplate = promptTemplates.items.find(
      (t) => t.id === promptTemplateId
    );
    const finalPrompt = selectedPromptTemplate
      ? customPrompt
        ? `${selectedPromptTemplate.prompt}\n\nAdditional instructions: ${customPrompt}`
        : selectedPromptTemplate.prompt
      : customPrompt;

    // Resolve image style to its prompt text
    const selectedStyle = imageStyles.items.find((s) => s.id === imageStyleId);
    const imageStylePrompt = selectedStyle?.prompt || '';

    const selectedBrand = brands.find((b) => b.id === brandId);

    onGenerate({
      title,
      topic,
      keywords: selectedKeywords,
      template_id: templateId,
      template_html: template?.html_structure || '',
      language,
      custom_prompt: finalPrompt,
      image_style: imageStylePrompt,
      brand_id: brandId,
      brand_name: selectedBrand?.name || '',
      brand_context: selectedBrand?.brand_context || '',
    });
  }

  // Get the data for the currently editing templates
  const editingPromptTemplate = promptDialogEdit
    ? promptTemplates.items.find((t) => t.id === promptDialogEdit)
    : null;
  const editingImageStyle = styleDialogEdit
    ? imageStyles.items.find((t) => t.id === styleDialogEdit)
    : null;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Brand */}
        {brands.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Brand</label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">No brand selected</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder={
              type === 'blog'
                ? 'e.g. 10 tipov na lepší spánok'
                : 'e.g. Prečo si kúpiť Hevi matrac'
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Topic</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            placeholder="Main topic or focus of the content"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Keywords */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Keywords</label>
          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {selectedKeywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => removeKeyword(kw)}
                  className="hover:text-destructive"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder="Type a keyword and press Enter"
              className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="px-3 h-9 text-sm bg-muted rounded-md hover:bg-muted/80"
            >
              Add
            </button>
          </div>

          {/* Keyword bank */}
          {keywords.length > 0 && (() => {
            const selectedBrandSlug = brands.find((b) => b.id === brandId)?.slug;
            const filteredKeywords = selectedBrandSlug
              ? keywords.filter((kw) => kw.brand === selectedBrandSlug)
              : keywords;
            return filteredKeywords.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Select from keyword bank{selectedBrandSlug ? ` (${selectedBrandSlug})` : ''}:
              </p>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {filteredKeywords.map((kw) => (
                  <button
                    key={kw.id}
                    type="button"
                    onClick={() => toggleKeywordFromBank(kw.keyword)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      selectedKeywords.includes(kw.keyword)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-input'
                    }`}
                  >
                    {kw.keyword}
                    {kw.volume ? ` (${kw.volume})` : ''}
                  </button>
                ))}
              </div>
            </div>
            ) : null;
          })()}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">HTML Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">No template (free-form)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {(Object.entries(LANGUAGES) as [LanguageCode, string][]).map(
                ([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* Prompt Template */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Prompt Template</label>
          <div className="flex gap-2">
            <select
              value={promptTemplateId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__new__') {
                  setPromptDialogEdit(null);
                  setPromptDialogOpen(true);
                } else {
                  handlePromptTemplateChange(val);
                }
              }}
              className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{promptTemplates.loading ? 'Loading...' : 'No template'}</option>
              {promptTemplates.items.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              <option value="__new__">+ New Template</option>
            </select>
            {promptTemplateId && (
              <button
                type="button"
                onClick={() => {
                  setPromptDialogEdit(promptTemplateId);
                  setPromptDialogOpen(true);
                }}
                className="flex items-center justify-center h-10 w-10 rounded-md border border-input hover:bg-muted"
                title="Edit template"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {promptTemplateId && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2 whitespace-pre-wrap">
              {promptTemplates.items.find((t) => t.id === promptTemplateId)
                ?.prompt}
            </p>
          )}
        </div>

        {/* Additional Prompt - separate box */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Additional Prompt</label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
            placeholder="Additional instructions for the AI (e.g. focus on specific benefits, mention a product, etc.)"
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {promptTemplateId
              ? 'This will be appended to the selected prompt template.'
              : 'Write custom instructions for the AI or select a template above.'}
          </p>
        </div>

        {/* Image Style */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Image Style</label>
          <div className="flex gap-2">
            <select
              value={imageStyleId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__new__') {
                  setStyleDialogEdit(null);
                  setStyleDialogOpen(true);
                } else {
                  setImageStyleId(val);
                }
              }}
              className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {imageStyles.items.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="__new__">+ New Style</option>
            </select>
            {imageStyleId && (
              <button
                type="button"
                onClick={() => {
                  setStyleDialogEdit(imageStyleId);
                  setStyleDialogOpen(true);
                }}
                className="flex items-center justify-center h-10 w-10 rounded-md border border-input hover:bg-muted"
                title="Edit style"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {imageStyles.items.find((s) => s.id === imageStyleId)?.prompt}
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !title || !topic}
          className="inline-flex items-center justify-center h-10 px-6 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Content'}
        </button>
      </form>

      {/* Prompt Template Editor Dialog */}
      <TemplateEditorDialog
        key={promptDialogOpen ? (promptDialogEdit || 'new-prompt') : 'closed-prompt'}
        open={promptDialogOpen}
        onClose={() => {
          setPromptDialogOpen(false);
          setPromptDialogEdit(null);
        }}
        onSave={async (data) => {
          if (promptDialogEdit) {
            await promptTemplates.update(promptDialogEdit, data);
          } else {
            const newTmpl = await promptTemplates.add(data);
            if (newTmpl) setPromptTemplateId(newTmpl.id);
          }
        }}
        onDelete={
          promptDialogEdit
            ? async () => {
                await promptTemplates.remove(promptDialogEdit);
                if (promptTemplateId === promptDialogEdit) {
                  setPromptTemplateId('');
                }
              }
            : undefined
        }
        initial={editingPromptTemplate}
        title={promptDialogEdit ? 'Edit Prompt Template' : 'New Prompt Template'}
        promptLabel="Prompt Instructions"
        promptPlaceholder="e.g. Write a comprehensive, SEO-optimized blog post..."
      />

      {/* Image Style Editor Dialog */}
      <TemplateEditorDialog
        key={styleDialogOpen ? (styleDialogEdit || 'new-style') : 'closed-style'}
        open={styleDialogOpen}
        onClose={() => {
          setStyleDialogOpen(false);
          setStyleDialogEdit(null);
        }}
        onSave={async (data) => {
          if (styleDialogEdit) {
            await imageStyles.update(styleDialogEdit, data);
          } else {
            const newStyle = await imageStyles.add(data);
            if (newStyle) setImageStyleId(newStyle.id);
          }
        }}
        onDelete={
          styleDialogEdit
            ? async () => {
                await imageStyles.remove(styleDialogEdit);
                if (imageStyleId === styleDialogEdit) {
                  setImageStyleId(imageStyles.items[0]?.id || '');
                }
              }
            : undefined
        }
        initial={editingImageStyle}
        title={styleDialogEdit ? 'Edit Image Style' : 'New Image Style'}
        promptLabel="Style Description"
        promptPlaceholder="e.g. Professional product photography. Clean white background, studio lighting..."
      />
    </>
  );
}
