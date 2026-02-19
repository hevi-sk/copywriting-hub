'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { SetupForm } from '@/components/projects/setup-form';
import { TiptapEditor } from '@/components/editor/tiptap-editor';
import { ExportDialog } from '@/components/projects/export-dialog';
import { PreviewDialog } from '@/components/projects/preview-dialog';
import { useToast } from '@/components/ui/use-toast';
import type { LanguageCode, Project } from '@/types';
import { SeoFields } from '@/components/projects/seo-fields';
import { Loader2, CheckCircle, FileText, Download, Eye } from 'lucide-react';

type Step = 'setup' | 'generating' | 'editing' | 'export';

export default function NewBlogPage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('setup');
  const [generating, setGenerating] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [content, setContent] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<Partial<Project>>({});
  const [showExport, setShowExport] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [imageStyle, setImageStyle] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [generatingSeo, setGeneratingSeo] = useState(false);

  async function handleGenerate(data: {
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
  }) {
    setGenerating(true);
    setStep('generating');

    // Create project in DB
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newProject, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        type: 'blog',
        title: data.title,
        topic: data.topic,
        keywords: data.keywords,
        template_id: data.template_id || null,
        brand_id: data.brand_id || null,
        language: data.language,
        ai_prompt: data.custom_prompt,
        status: 'generating',
      })
      .select()
      .single();

    if (error || !newProject) {
      toast({
        title: 'Error',
        description: 'Failed to create project.',
        variant: 'destructive',
      });
      setStep('setup');
      setGenerating(false);
      return;
    }

    setProjectId(newProject.id);
    setProject(newProject);
    setBrandName(data.brand_name);
    setImageStyle(data.image_style);

    // Stream content generation
    try {
      const res = await fetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_type: 'blog',
          title: data.title,
          topic: data.topic,
          keywords: data.keywords,
          template_html: data.template_html,
          language: data.language,
          custom_prompt: data.custom_prompt,
          image_count: 2,
          brand_name: data.brand_name,
          brand_context: data.brand_context,
        }),
      });

      if (!res.ok) {
        throw new Error('Generation failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setContent(accumulated);
        }
      }

      // Save generated content
      await supabase
        .from('projects')
        .update({
          content_html: accumulated,
          status: 'editing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', newProject.id);

      setProject((prev) => ({
        ...prev,
        content_html: accumulated,
        status: 'editing',
      }));

      // Generate images
      setGeneratingImages(true);
      try {
        const imgRes = await fetch('/api/ai/generate-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html_content: accumulated,
            brand_name: data.brand_name,
            brand_context: data.brand_context,
            image_style: data.image_style,
          }),
        });
        const imgData = await imgRes.json();

        if (imgData.images?.length > 0) {
          let updatedHtml = accumulated;
          for (const img of imgData.images) {
            updatedHtml = updatedHtml.replace(
              img.placeholder,
              `<img src="${img.imageUrl}" alt="${img.alt}" />`
            );
          }
          setContent(updatedHtml);
          await supabase
            .from('projects')
            .update({
              content_html: updatedHtml,
              images: imgData.images,
              updated_at: new Date().toISOString(),
            })
            .eq('id', newProject.id);
        }
      } catch {
        console.error('Image generation failed, continuing without images');
      }
      setGeneratingImages(false);

      setStep('editing');

      // Auto-generate SEO metadata
      generateSeo(accumulated);
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: 'An error occurred during content generation.',
        variant: 'destructive',
      });
      setStep('setup');
    }

    setGenerating(false);
  }

  async function generateSeo(htmlContent?: string) {
    const html = htmlContent || content;
    if (!html) return;
    setGeneratingSeo(true);
    try {
      const res = await fetch('/api/ai/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_html: html,
          title: project.title || '',
          keywords: project.keywords || [],
          language: project.language || 'sk',
          brand_name: brandName,
        }),
      });
      const data = await res.json();
      if (data.seo_title) setSeoTitle(data.seo_title);
      if (data.seo_description) setSeoDescription(data.seo_description);

      // Save to DB
      if (projectId) {
        await supabase
          .from('projects')
          .update({
            seo_title: data.seo_title || null,
            seo_description: data.seo_description || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectId);
      }
    } catch (error) {
      console.error('SEO generation failed:', error);
    }
    setGeneratingSeo(false);
  }

  async function handleSave(html: string) {
    if (!projectId) return;
    await supabase
      .from('projects')
      .update({
        content_html: html,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);
  }

  async function handleFinalize() {
    if (!projectId) return;
    await supabase
      .from('projects')
      .update({ status: 'finalized', updated_at: new Date().toISOString() })
      .eq('id', projectId);

    setProject((prev) => ({ ...prev, status: 'finalized' }));
    toast({ title: 'Finalized', description: 'Blog marked as finalized.' });
  }

  async function handleTranslated(lang: LanguageCode, html: string) {
    if (!projectId) return;

    const translations = { ...(project.translated_versions || {}), [lang]: html };
    await supabase
      .from('projects')
      .update({
        translated_versions: translations,
        status: 'translated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    setProject((prev) => ({
      ...prev,
      translated_versions: translations as any,
      status: 'translated',
    }));
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-2 text-sm">
        {(['setup', 'generating', 'editing', 'export'] as Step[]).map(
          (s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && (
                <div className="w-8 h-px bg-border" />
              )}
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : ['setup', 'generating', 'editing', 'export'].indexOf(
                          step
                        ) >
                        ['setup', 'generating', 'editing', 'export'].indexOf(s)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {['setup', 'generating', 'editing', 'export'].indexOf(step) >
                ['setup', 'generating', 'editing', 'export'].indexOf(s) ? (
                  <CheckCircle className="h-3 w-3" />
                ) : null}
                {s === 'setup' && 'Setup'}
                {s === 'generating' && 'Generate'}
                {s === 'editing' && 'Edit'}
                {s === 'export' && 'Export'}
              </div>
            </div>
          )
        )}
      </div>

      {/* Step Content */}
      {step === 'setup' && (
        <div>
          <h1 className="text-2xl font-bold mb-6">New Blog Post</h1>
          <SetupForm type="blog" onGenerate={handleGenerate} loading={generating} />
        </div>
      )}

      {step === 'generating' && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Generating Blog</h1>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>
              {generatingImages
                ? 'Generating images...'
                : 'Generating content...'}
            </span>
          </div>
          {content && (
            <div className="rounded-lg border bg-card p-6">
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          )}
        </div>
      )}

      {step === 'editing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {project.title || 'Edit Blog'}
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button
                onClick={handleFinalize}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                Finalize
              </button>
              <button
                onClick={() => setShowExport(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          <TiptapEditor
            content={content}
            onChange={setContent}
            onSave={handleSave}
            projectType="blog"
            brandName={brandName}
            imageStyle={imageStyle}
          />

          <SeoFields
            seoTitle={seoTitle}
            seoDescription={seoDescription}
            onSeoTitleChange={(val) => {
              setSeoTitle(val);
              if (projectId) {
                supabase
                  .from('projects')
                  .update({ seo_title: val, updated_at: new Date().toISOString() })
                  .eq('id', projectId);
              }
            }}
            onSeoDescriptionChange={(val) => {
              setSeoDescription(val);
              if (projectId) {
                supabase
                  .from('projects')
                  .update({ seo_description: val, updated_at: new Date().toISOString() })
                  .eq('id', projectId);
              }
            }}
            onGenerate={() => generateSeo()}
            generating={generatingSeo}
          />
        </div>
      )}

      {showExport && project && (
        <ExportDialog
          project={project as Project}
          open={showExport}
          onClose={() => setShowExport(false)}
          onTranslated={handleTranslated}
        />
      )}

      <PreviewDialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        html={content}
        title={project.title}
      />
    </div>
  );
}
