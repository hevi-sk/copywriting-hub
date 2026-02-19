'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TiptapEditor } from '@/components/editor/tiptap-editor';
import { ExportDialog } from '@/components/projects/export-dialog';
import { PreviewDialog } from '@/components/projects/preview-dialog';
import { useToast } from '@/components/ui/use-toast';
import type { Project, LanguageCode } from '@/types';
import { SeoFields } from '@/components/projects/seo-fields';
import { CheckCircle, Download, ArrowLeft, Loader2, Eye } from 'lucide-react';
import Link from 'next/link';

export default function BlogEditorPage() {
  const params = useParams();
  const supabase = createClient();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [generatingSeo, setGeneratingSeo] = useState(false);

  useEffect(() => {
    loadProject();
  }, [params.id]);

  async function loadProject() {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single();

    if (data) {
      setProject(data as Project);
      setContent(data.content_html || '');
      setSeoTitle(data.seo_title || '');
      setSeoDescription(data.seo_description || '');

      if (data.brand_id) {
        const { data: brand } = await supabase
          .from('brands')
          .select('name')
          .eq('id', data.brand_id)
          .single();
        if (brand) setBrandName(brand.name);
      }
    }
    setLoading(false);
  }

  async function generateSeo() {
    if (!content || !project) return;
    setGeneratingSeo(true);
    try {
      const res = await fetch('/api/ai/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_html: content,
          title: project.title || '',
          keywords: project.keywords || [],
          language: project.language || 'sk',
          brand_name: brandName,
        }),
      });
      const data = await res.json();
      if (data.seo_title) setSeoTitle(data.seo_title);
      if (data.seo_description) setSeoDescription(data.seo_description);

      await supabase
        .from('projects')
        .update({
          seo_title: data.seo_title || null,
          seo_description: data.seo_description || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id);
    } catch (error) {
      console.error('SEO generation failed:', error);
    }
    setGeneratingSeo(false);
  }

  async function handleSave(html: string) {
    await supabase
      .from('projects')
      .update({
        content_html: html,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);
  }

  async function handleFinalize() {
    await supabase
      .from('projects')
      .update({ status: 'finalized', updated_at: new Date().toISOString() })
      .eq('id', params.id);

    setProject((prev) => (prev ? { ...prev, status: 'finalized' } : prev));
    toast({ title: 'Finalized', description: 'Blog marked as finalized.' });
  }

  async function handleTranslated(lang: LanguageCode, html: string) {
    if (!project) return;
    const translations = { ...(project.translated_versions || {}), [lang]: html };
    await supabase
      .from('projects')
      .update({
        translated_versions: translations,
        status: 'translated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    setProject((prev) =>
      prev
        ? { ...prev, translated_versions: translations as any, status: 'translated' }
        : prev
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project not found.</p>
        <Link href="/blogs" className="text-primary hover:underline text-sm mt-2 inline-block">
          Back to blogs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/blogs"
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{project.title}</h1>
            <p className="text-sm text-muted-foreground">
              {project.topic} &middot;{' '}
              <span className="capitalize">{project.status}</span>
            </p>
          </div>
        </div>
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
      />

      <SeoFields
        seoTitle={seoTitle}
        seoDescription={seoDescription}
        onSeoTitleChange={(val) => {
          setSeoTitle(val);
          supabase
            .from('projects')
            .update({ seo_title: val, updated_at: new Date().toISOString() })
            .eq('id', params.id);
        }}
        onSeoDescriptionChange={(val) => {
          setSeoDescription(val);
          supabase
            .from('projects')
            .update({ seo_description: val, updated_at: new Date().toISOString() })
            .eq('id', params.id);
        }}
        onGenerate={generateSeo}
        generating={generatingSeo}
      />

      {showExport && (
        <ExportDialog
          project={project}
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
