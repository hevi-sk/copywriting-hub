'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Template, ProjectType } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Trash2, Globe, Code, Eye, Pencil, X } from 'lucide-react';

export default function TemplatesPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<'url' | 'html'>('url');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    type: 'blog' as ProjectType,
    source_url: '',
    html_structure: '',
    description: '',
  });
  const [scraping, setScraping] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    const { data } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  }

  function resetForm() {
    setForm({
      name: '',
      type: 'blog',
      source_url: '',
      html_structure: '',
      description: '',
    });
    setEditingId(null);
    setFormMode('url');
    setShowForm(false);
  }

  function handleEdit(template: Template) {
    setForm({
      name: template.name,
      type: template.type,
      source_url: template.source_url || '',
      html_structure: template.html_structure,
      description: template.description || '',
    });
    setFormMode(template.source_type === 'url' ? 'url' : 'html');
    setEditingId(template.id);
    setShowForm(true);
    // Scroll to top where the form is
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleNewTemplate() {
    resetForm();
    setShowForm(true);
  }

  async function handleScrapeUrl() {
    if (!form.source_url) return;
    setScraping(true);

    try {
      const res = await fetch('/api/templates/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.source_url }),
      });
      const data = await res.json();

      if (data.error) {
        toast({
          title: 'Scrape failed',
          description: data.error,
          variant: 'destructive',
        });
      } else {
        setForm({ ...form, html_structure: data.html });
        toast({ title: 'Success', description: 'HTML extracted from URL.' });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to scrape URL.',
        variant: 'destructive',
      });
    }
    setScraping(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (editingId) {
      // Update existing template
      const { error } = await supabase
        .from('templates')
        .update({
          name: form.name,
          type: form.type,
          source_type: formMode,
          source_url: formMode === 'url' ? form.source_url : null,
          html_structure: form.html_structure,
          description: form.description,
        })
        .eq('id', editingId);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update template.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Updated', description: 'Template updated.' });
        resetForm();
        loadTemplates();
      }
    } else {
      // Create new template
      const { error } = await supabase.from('templates').insert({
        user_id: user.id,
        name: form.name,
        type: form.type,
        source_type: formMode,
        source_url: formMode === 'url' ? form.source_url : null,
        html_structure: form.html_structure,
        description: form.description,
      });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to save template.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Saved', description: 'Template created.' });
        resetForm();
        loadTemplates();
      }
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (!error) {
      setTemplates(templates.filter((t) => t.id !== id));
      if (editingId === id) resetForm();
      toast({ title: 'Deleted', description: 'Template removed.' });
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-muted-foreground mt-1">
            HTML structures for content generation
          </p>
        </div>
        <button
          onClick={handleNewTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <PlusCircle className="h-4 w-4" />
          New Template
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {editingId ? 'Edit Template' : 'New Template'}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Template Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Hevisleep Blog v1"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as ProjectType })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="blog">Blog</option>
                  <option value="presell">Presell Page</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Short description of this template"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Source mode toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormMode('url')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${formMode === 'url' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                <Globe className="h-3.5 w-3.5" />
                From URL
              </button>
              <button
                type="button"
                onClick={() => setFormMode('html')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${formMode === 'html' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                <Code className="h-3.5 w-3.5" />
                Paste HTML
              </button>
            </div>

            {formMode === 'url' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Source URL</label>
                <div className="flex gap-2">
                  <input
                    value={form.source_url}
                    onChange={(e) =>
                      setForm({ ...form, source_url: e.target.value })
                    }
                    placeholder="https://example.com/blog-post"
                    className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleScrapeUrl}
                    disabled={scraping}
                    className="inline-flex items-center px-4 h-10 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
                  >
                    {scraping ? 'Scraping...' : 'Extract HTML'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">HTML Structure</label>
              <textarea
                value={form.html_structure}
                onChange={(e) =>
                  setForm({ ...form, html_structure: e.target.value })
                }
                required
                rows={12}
                placeholder="<article>&#10;  <h1>Title here</h1>&#10;  <p>Content...</p>&#10;</article>"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                {editingId ? 'Update Template' : 'Save Template'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center px-4 py-2 text-sm font-medium bg-muted rounded-md hover:bg-muted/80"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
          <p>No templates yet. Create one to get started with content generation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`rounded-lg border bg-card p-4 space-y-3 ${editingId === template.id ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {template.description || 'No description'}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                  {template.type}
                </span>
              </div>

              {template.source_url && (
                <p className="text-xs text-muted-foreground truncate">
                  Source: {template.source_url}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted rounded-md hover:bg-muted/80"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={() =>
                    setPreviewId(
                      previewId === template.id ? null : template.id
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted rounded-md hover:bg-muted/80"
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-destructive bg-destructive/10 rounded-md hover:bg-destructive/20"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>

              {previewId === template.id && (
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                  {template.html_structure}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
