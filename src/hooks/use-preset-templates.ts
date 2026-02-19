'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface PresetTemplate {
  id: string;
  name: string;
  prompt: string;
}

type PresetType = 'prompt_template' | 'image_style';

export function usePresetTemplates(presetType: PresetType, defaults: PresetTemplate[]) {
  const supabase = createClient();
  const [items, setItems] = useState<PresetTemplate[]>(defaults);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    loadPresets();
  }, [presetType]);

  async function loadPresets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setInitialized(true);
      return;
    }

    const { data, error } = await supabase
      .from('user_presets')
      .select('*')
      .eq('type', presetType)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load presets:', error);
      setLoading(false);
      setInitialized(true);
      return;
    }

    if (data && data.length > 0) {
      // User has presets in DB — use them
      setItems(data.map((row) => ({ id: row.id, name: row.name, prompt: row.prompt })));
      setInitialized(true);
    } else if (!initialized) {
      // First load ever — seed defaults into Supabase
      const rows = defaults.map((d) => ({
        user_id: user.id,
        type: presetType,
        name: d.name,
        prompt: d.prompt,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from('user_presets')
        .insert(rows)
        .select();

      if (insertError) {
        console.error('Failed to seed defaults:', insertError);
      } else if (inserted) {
        setItems(inserted.map((row) => ({ id: row.id, name: row.name, prompt: row.prompt })));
      }
      setInitialized(true);
    }

    setLoading(false);
  }

  async function add(template: Omit<PresetTemplate, 'id'>): Promise<PresetTemplate | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_presets')
      .insert({
        user_id: user.id,
        type: presetType,
        name: template.name,
        prompt: template.prompt,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to add preset:', error);
      return null;
    }

    const newItem: PresetTemplate = { id: data.id, name: data.name, prompt: data.prompt };
    setItems((prev) => [...prev, newItem]);
    return newItem;
  }

  async function update(id: string, updates: Partial<Omit<PresetTemplate, 'id'>>) {
    const { error } = await supabase
      .from('user_presets')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Failed to update preset:', error);
      return;
    }

    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }

  async function remove(id: string) {
    const { error } = await supabase
      .from('user_presets')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete preset:', error);
      return;
    }

    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  return { items, loading, add, update, remove };
}
