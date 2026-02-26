'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { BrandRecord } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Trash2, Pencil, X, Globe, Loader2 } from 'lucide-react';

export default function BrandsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    website_url: '',
    brand_context: '',
    products: '',
    vop: '',
    tone_of_voice: '',
    target_audience: '',
  });

  useEffect(() => {
    loadBrands();
  }, []);

  async function loadBrands() {
    const { data } = await supabase
      .from('brands')
      .select('*')
      .order('created_at', { ascending: false });
    setBrands(data || []);
    setLoading(false);
  }

  function resetForm() {
    setForm({ name: '', slug: '', website_url: '', brand_context: '', products: '', vop: '', tone_of_voice: '', target_audience: '' });
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(brand: BrandRecord) {
    setForm({
      name: brand.name,
      slug: brand.slug,
      website_url: brand.website_url || '',
      brand_context: brand.brand_context || '',
      products: brand.products || '',
      vop: brand.vop || '',
      tone_of_voice: brand.tone_of_voice || '',
      target_audience: brand.target_audience || '',
    });
    setEditingId(brand.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleNewBrand() {
    resetForm();
    setShowForm(true);
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function handleScrapeUrl() {
    if (!form.website_url) return;
    setScraping(true);

    try {
      const res = await fetch('/api/brands/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.website_url }),
      });
      const data = await res.json();

      if (data.error) {
        toast({
          title: 'Scrape failed',
          description: data.error,
          variant: 'destructive',
        });
      } else {
        setForm({ ...form, brand_context: data.brand_context });
        toast({ title: 'Success', description: 'Brand info extracted from URL.' });
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

    const slug = form.slug || generateSlug(form.name);
    const brandData = {
      name: form.name,
      slug,
      website_url: form.website_url || null,
      brand_context: form.brand_context || null,
      products: form.products || null,
      vop: form.vop || null,
      tone_of_voice: form.tone_of_voice || null,
      target_audience: form.target_audience || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('brands')
        .update({ ...brandData, updated_at: new Date().toISOString() })
        .eq('id', editingId);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update brand.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Updated', description: 'Brand updated.' });
        resetForm();
        loadBrands();
      }
    } else {
      const { error } = await supabase.from('brands').insert({
        user_id: user.id,
        ...brandData,
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message.includes('unique')
            ? 'A brand with this slug already exists.'
            : 'Failed to save brand.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Saved', description: 'Brand created.' });
        resetForm();
        loadBrands();
      }
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (!error) {
      setBrands(brands.filter((b) => b.id !== id));
      if (editingId === id) resetForm();
      toast({ title: 'Deleted', description: 'Brand removed.' });
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

  const brandFields = [
    { key: 'products' as const, label: 'Products / Services' },
    { key: 'vop' as const, label: 'VOP (Conditions)' },
    { key: 'tone_of_voice' as const, label: 'Tone of Voice' },
    { key: 'target_audience' as const, label: 'Target Audience' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Brands</h1>
          <p className="text-muted-foreground mt-1">
            Manage brands and their product context for AI generation
          </p>
        </div>
        <button
          onClick={handleNewBrand}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <PlusCircle className="h-4 w-4" />
          New Brand
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {editingId ? 'Edit Brand' : 'New Brand'}
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
                <label className="text-sm font-medium">Brand Name</label>
                <input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm({
                      ...form,
                      name,
                      slug: editingId ? form.slug : generateSlug(name),
                    });
                  }}
                  required
                  placeholder="e.g. Hevisleep"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                  placeholder="e.g. hevisleep"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Used to match keywords. Auto-generated from name.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Website URL</label>
              <div className="flex gap-2">
                <input
                  value={form.website_url}
                  onChange={(e) =>
                    setForm({ ...form, website_url: e.target.value })
                  }
                  placeholder="https://example.com"
                  className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleScrapeUrl}
                  disabled={scraping || !form.website_url}
                  className="inline-flex items-center gap-2 px-4 h-10 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
                >
                  {scraping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  {scraping ? 'Scraping...' : 'Scrape Products'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Brand Context</label>
              <textarea
                value={form.brand_context}
                onChange={(e) =>
                  setForm({ ...form, brand_context: e.target.value })
                }
                rows={6}
                placeholder="General brand description, key selling points... This context is passed to the AI when generating content."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground">
                This text is included in AI prompts. You can scrape from URL and then edit manually.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {brandFields.map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium">{label}</label>
                  <textarea
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    rows={3}
                    placeholder={`Enter ${label.toLowerCase()}...`}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                {editingId ? 'Update Brand' : 'Save Brand'}
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

      {/* Brands Grid */}
      {brands.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
          <p>No brands yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className={`rounded-lg border bg-card p-4 space-y-3 ${editingId === brand.id ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{brand.name}</h3>
                  <p className="text-xs text-muted-foreground">{brand.slug}</p>
                </div>
              </div>

              {brand.website_url && (
                <p className="text-xs text-muted-foreground truncate">
                  {brand.website_url}
                </p>
              )}

              {brand.brand_context && (
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {brand.brand_context}
                </p>
              )}

              {brandFields.some(({ key }) => brand[key]) && (
                <div className="border-t pt-2 space-y-1">
                  {brandFields.map(({ key, label }) =>
                    brand[key] ? (
                      <p key={key} className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{label}:</span>{' '}
                        <span className="line-clamp-1">{brand[key]}</span>
                      </p>
                    ) : null
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(brand)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-muted rounded-md hover:bg-muted/80"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(brand.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-destructive bg-destructive/10 rounded-md hover:bg-destructive/20"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
