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
  const [items, setItems] = useState<StoredTemplate[]>(() =>
    loadFromStorage(storageKey, defaults)
  );

  useEffect(() => {
    setItems(loadFromStorage(storageKey, defaults));
  }, [storageKey, defaults]);

  const writeStorage = useCallback(
    (next: StoredTemplate[]) => {
      localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey]
  );

  const add = useCallback(
    (template: Omit<StoredTemplate, 'id'>) => {
      const newItem = { ...template, id: crypto.randomUUID() };
      setItems((prev) => {
        const next = [...prev, newItem];
        writeStorage(next);
        return next;
      });
      return newItem;
    },
    [writeStorage]
  );

  const update = useCallback(
    (id: string, updates: Partial<Omit<StoredTemplate, 'id'>>) => {
      setItems((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
        writeStorage(next);
        return next;
      });
    },
    [writeStorage]
  );

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((t) => t.id !== id);
        writeStorage(next);
        return next;
      });
    },
    [writeStorage]
  );

  return { items, add, update, remove };
}
