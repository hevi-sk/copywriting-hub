'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { KeywordEntry, BrandRecord, KeywordSuggestion } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import {
  Search,
  Upload,
  Sparkles,
  Trash2,
  ArrowUpDown,
  Download,
} from 'lucide-react';

export default function KeywordsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [keywords, setKeywords] = useState<KeywordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [suggestingLoading, setSuggestingLoading] = useState(false);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [importBrand, setImportBrand] = useState<string>('');
  const [importCountry, setImportCountry] = useState<string>('sk');

  useEffect(() => {
    loadKeywords();
    loadBrands();
  }, []);

  async function loadBrands() {
    const { data } = await supabase.from('brands').select('*').order('name');
    setBrands(data || []);
    if (data?.length && !importBrand) {
      setImportBrand(data[0].slug);
    }
  }

  async function loadKeywords() {
    const { data } = await supabase
      .from('keyword_research')
      .select('*')
      .order('created_at', { ascending: false });
    setKeywords(data || []);
    setLoading(false);
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('brand', importBrand);
    formData.append('country', importCountry);

    try {
      const res = await fetch('/api/keywords/import-csv', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.error) {
        toast({
          title: 'Import failed',
          description: data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Import complete',
          description: `${data.imported} keywords imported.`,
        });
        loadKeywords();
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to import CSV.',
        variant: 'destructive',
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleAiSuggestions() {
    setSuggestingLoading(true);
    setShowSuggestions(true);

    try {
      const res = await fetch('/api/ai/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: importBrand,
          country: importCountry === 'sk' ? 'Slovakia' : importCountry,
          language: importCountry,
        }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to generate suggestions.',
        variant: 'destructive',
      });
    }

    setSuggestingLoading(false);
  }

  async function saveSuggestion(suggestion: KeywordSuggestion) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('keyword_research').insert({
      user_id: user.id,
      keyword: suggestion.keyword,
      volume: suggestion.estimated_volume,
      source: 'ai_suggestion',
      brand: importBrand,
      country: importCountry,
      notes: `${suggestion.intent} - ${suggestion.reasoning}`,
    });

    if (!error) {
      toast({ title: 'Saved', description: `"${suggestion.keyword}" added.` });
      loadKeywords();
    }
  }

  async function handleDelete(ids: string[]) {
    const { error } = await supabase
      .from('keyword_research')
      .delete()
      .in('id', ids);

    if (!error) {
      setKeywords(keywords.filter((k) => !ids.includes(k.id)));
      setSelectedIds(new Set());
      toast({
        title: 'Deleted',
        description: `${ids.length} keyword(s) removed.`,
      });
    }
  }

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  const filtered = keywords
    .filter((k) => {
      if (searchQuery && !k.keyword.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterBrand !== 'all' && k.brand !== filterBrand) return false;
      if (filterSource !== 'all' && k.source !== filterSource) return false;
      return true;
    })
    .sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const allSelected =
    filtered.length > 0 && filtered.every((k) => selectedIds.has(k.id));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Keyword Research</h1>
        <p className="text-muted-foreground mt-1">
          Manage your keyword bank for SEO content
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <select
            value={importBrand}
            onChange={(e) => setImportBrand(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={importCountry}
            onChange={(e) => setImportCountry(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="sk">Slovakia</option>
            <option value="cs">Czech Republic</option>
            <option value="en">International</option>
            <option value="da">Denmark</option>
            <option value="hu">Hungary</option>
          </select>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleCsvUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </button>

        <button
          onClick={handleAiSuggestions}
          disabled={suggestingLoading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {suggestingLoading ? 'Generating...' : 'AI Suggestions'}
        </button>

        {selectedIds.size > 0 && (
          <button
            onClick={() => handleDelete(Array.from(selectedIds))}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-destructive bg-destructive/10 rounded-md hover:bg-destructive/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete ({selectedIds.size})
          </button>
        )}
      </div>

      {/* AI Suggestions Panel */}
      {showSuggestions && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">AI Keyword Suggestions</h3>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          {suggestingLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Sparkles className="h-4 w-4 animate-spin" />
              Generating keyword suggestions...
            </div>
          ) : suggestions.length > 0 ? (
            <div className="overflow-auto max-h-80">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Keyword</th>
                    <th className="text-left p-2">Est. Volume</th>
                    <th className="text-left p-2">Intent</th>
                    <th className="text-left p-2">Reasoning</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((s, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-2 font-medium">{s.keyword}</td>
                      <td className="p-2">{s.estimated_volume}</td>
                      <td className="p-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                          {s.intent}
                        </span>
                      </td>
                      <td className="p-2 text-muted-foreground text-xs max-w-xs truncate">
                        {s.reasoning}
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => saveSuggestion(s)}
                          className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No suggestions yet.</p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords..."
            className="h-9 w-full pl-9 pr-3 rounded-md border border-input bg-background text-sm"
          />
        </div>
        <select
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All Brands</option>
          {brands.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All Sources</option>
          <option value="gsc">GSC</option>
          <option value="ahrefs_import">Ahrefs Import</option>
          <option value="ai_suggestion">AI Suggestion</option>
        </select>
      </div>

      {/* Keywords Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(filtered.map((k) => k.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th
                  className="text-left p-3 cursor-pointer select-none"
                  onClick={() => toggleSort('keyword')}
                >
                  <span className="inline-flex items-center gap-1">
                    Keyword <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th
                  className="text-left p-3 cursor-pointer select-none"
                  onClick={() => toggleSort('volume')}
                >
                  <span className="inline-flex items-center gap-1">
                    Volume <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th
                  className="text-left p-3 cursor-pointer select-none"
                  onClick={() => toggleSort('difficulty')}
                >
                  <span className="inline-flex items-center gap-1">
                    KD <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="text-left p-3">Source</th>
                <th className="text-left p-3">Brand</th>
                <th className="text-left p-3">Country</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No keywords found. Import a CSV or generate AI suggestions.
                  </td>
                </tr>
              ) : (
                filtered.map((kw) => (
                  <tr key={kw.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(kw.id)}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(kw.id);
                          else next.delete(kw.id);
                          setSelectedIds(next);
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="p-3 font-medium">{kw.keyword}</td>
                    <td className="p-3">{kw.volume ?? '-'}</td>
                    <td className="p-3">{kw.difficulty ?? '-'}</td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                        {kw.source || 'manual'}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{kw.brand || '-'}</td>
                    <td className="p-3 text-muted-foreground">
                      {kw.country?.toUpperCase()}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDelete([kw.id])}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} keyword{filtered.length !== 1 ? 's' : ''} shown
      </p>
    </div>
  );
}
