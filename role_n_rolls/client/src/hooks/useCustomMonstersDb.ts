/**
 * IndexedDB-backed store for user-authored monsters (source: 'custom').
 * Mirrors the pattern of useCustomSoundsDb / useCustomScenesDb: one object
 * store keyed by the monster's slug (auto-generated if missing). SRD monsters
 * are read-only and never land here.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Monster } from '@/types/monster';

const DB_NAME = 'rnr_monsters';
const STORE = 'monsters';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'slug' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAll(): Promise<Monster[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result ?? []) as Monster[]);
    req.onerror = () => reject(req.error);
  });
}

async function put(monster: Monster): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(monster);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function del(slug: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(slug);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function generateSlug(name: string, existing: Set<string>): string {
  const base = slugify(name) || 'monstre';
  let candidate = `custom_${base}`;
  let i = 2;
  while (existing.has(candidate)) {
    candidate = `custom_${base}_${i}`;
    i += 1;
  }
  return candidate;
}

export function useCustomMonstersDb() {
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setMonsters(await getAll());
      } catch (err) {
        console.warn('[monsters] load error', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const add = useCallback(async (monster: Monster): Promise<Monster> => {
    const existing = new Set(monsters.map((m) => String(m.slug ?? '')).filter(Boolean));
    const slug = monster.slug && !existing.has(monster.slug) ? monster.slug : generateSlug(monster.name, existing);
    const stored: Monster = { ...monster, slug, source: 'custom' };
    await put(stored);
    setMonsters((prev) => [...prev.filter((m) => m.slug !== slug), stored]);
    return stored;
  }, [monsters]);

  const update = useCallback(async (slug: string, patch: Partial<Monster>): Promise<Monster | null> => {
    const current = monsters.find((m) => m.slug === slug);
    if (!current) return null;
    const updated: Monster = { ...current, ...patch, slug, source: 'custom' };
    await put(updated);
    setMonsters((prev) => prev.map((m) => (m.slug === slug ? updated : m)));
    return updated;
  }, [monsters]);

  const remove = useCallback(async (slug: string) => {
    await del(slug);
    setMonsters((prev) => prev.filter((m) => m.slug !== slug));
  }, []);

  return { monsters, loaded, add, update, remove };
}
