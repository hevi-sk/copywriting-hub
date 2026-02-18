'use client';

import { useState, useEffect, useRef } from 'react';

export interface StoredTemplate {
  id: string;
  name: string;
  prompt: string;
}

export function useLocalTemplates(storageKey: string, defaults: StoredTemplate[]) {
  const [items, setItems] = useState<StoredTemplate[]>(defaults);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setItems(parsed);
      } catch {
        // keep defaults
      }
    } else {
      localStorage.setItem(storageKey, JSON.stringify(defaults));
    }
  }, [storageKey, defaults]);

  function save(next: StoredTemplate[]) {
    setItems(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function add(template: Omit<StoredTemplate, 'id'>) {
    const newItem: StoredTemplate = { ...template, id: crypto.randomUUID() };
    const next = [...itemsRef.current, newItem];
    save(next);
    return newItem;
  }

  function update(id: string, updates: Partial<Omit<StoredTemplate, 'id'>>) {
    const next = itemsRef.current.map((t) => (t.id === id ? { ...t, ...updates } : t));
    save(next);
  }

  function remove(id: string) {
    const next = itemsRef.current.filter((t) => t.id !== id);
    save(next);
  }

  return { items, add, update, remove };
}
