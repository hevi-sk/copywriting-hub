'use client';

import { useState, useEffect, useCallback } from 'react';

export interface StoredTemplate {
  id: string;
  name: string;
  prompt: string;
}

function loadFromStorage(key: string, defaults: StoredTemplate[]): StoredTemplate[] {
  if (typeof window === 'undefined') return defaults;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaults;
    }
  }
  // Seed with defaults on first load
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}

export function useLocalTemplates(storageKey: string, defaults: StoredTemplate[]) {
  const [items, setItems] = useState<StoredTemplate[]>(defaults);

  useEffect(() => {
    setItems(loadFromStorage(storageKey, defaults));
  }, [storageKey]);

  const persist = useCallback(
    (next: StoredTemplate[]) => {
      setItems(next);
      localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey]
  );

  const add = useCallback(
    (template: Omit<StoredTemplate, 'id'>) => {
      const newItem = { ...template, id: crypto.randomUUID() };
      persist([...items, newItem]);
      return newItem;
    },
    [items, persist]
  );

  const update = useCallback(
    (id: string, updates: Partial<Omit<StoredTemplate, 'id'>>) => {
      persist(items.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    },
    [items, persist]
  );

  const remove = useCallback(
    (id: string) => {
      persist(items.filter((t) => t.id !== id));
    },
    [items, persist]
  );

  return { items, add, update, remove };
}
