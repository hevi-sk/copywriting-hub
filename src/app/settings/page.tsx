'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AISettings } from '@/types';
import { useToast } from '@/components/ui/use-toast';

export default function SettingsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Partial<AISettings>>({
    openai_api_key: '',
    google_api_key: '',
    brand_context: '',
    default_ai_model: 'gpt-4o',
    default_language: 'sk',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setSettings(data);
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('ai_settings').upsert(
      {
        user_id: user.id,
        openai_api_key: settings.openai_api_key,
        google_api_key: settings.google_api_key,
        brand_context: settings.brand_context,
        default_ai_model: settings.default_ai_model,
        default_language: settings.default_language,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Saved',
        description: 'Settings saved successfully.',
      });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your API keys and brand context
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* API Keys */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Keys are stored securely and used for AI content generation.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">OpenAI API Key</label>
            <input
              type="password"
              value={settings.openai_api_key || ''}
              onChange={(e) =>
                setSettings({ ...settings, openai_api_key: e.target.value })
              }
              placeholder="sk-..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Google API Key</label>
            <input
              type="password"
              value={settings.google_api_key || ''}
              onChange={(e) =>
                setSettings({ ...settings, google_api_key: e.target.value })
              }
              placeholder="AIza..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Brand Context */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Brand Context</h2>
          <p className="text-sm text-muted-foreground">
            This context is included in all AI prompts to ensure brand
            consistency.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">Brand Context</label>
            <textarea
              value={settings.brand_context || ''}
              onChange={(e) =>
                setSettings({ ...settings, brand_context: e.target.value })
              }
              placeholder="Describe your brands, products, tone of voice, target audience, etc. This helps the AI write better content for your brand."
              rows={6}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Defaults */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Defaults</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Default AI Model</label>
              <select
                value={settings.default_ai_model || 'claude'}
                onChange={(e) =>
                  setSettings({ ...settings, default_ai_model: e.target.value })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="gpt-4o">GPT-4o (OpenAI)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Default Language</label>
              <select
                value={settings.default_language || 'sk'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_language: e.target.value as any,
                  })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="sk">Slovenčina</option>
                <option value="cs">Čeština</option>
                <option value="en">English</option>
                <option value="da">Dansk</option>
                <option value="hu">Magyar</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center h-10 px-6 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
