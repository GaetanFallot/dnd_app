/**
 * IndexedDB persistence for user-imported scenes (images/videos).
 * Mirrors the `dm_screen` DB / `scenes` object store used by the legacy app,
 * so imports made from the old HTML remain readable here.
 */

import { useEffect, useState, useCallback } from 'react';
import type { Scene } from '@/data/scenes';

const DB_NAME = 'dm_screen';
const STORE = 'scenes';
const DB_VERSION = 2;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles');
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAll(): Promise<Scene[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result ?? []) as Scene[]);
    req.onerror = () => reject(req.error);
  });
}

async function put(scene: Scene): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(scene);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function del(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function useCustomScenesDb() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const all = await getAll();
      setScenes(all);
    } catch (err) {
      console.warn('[scenes] load error', err);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addFromFile = useCallback(async (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const reader = new FileReader();
    const dataUrl: string = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const scene: Scene = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
      tag: isVideo ? 'Vidéo importée' : 'Image personnalisée',
      bg: '#000',
      emoji: isVideo ? '🎬' : '🗺️',
      src: dataUrl,
      isVideo,
    };
    await put(scene);
    setScenes((prev) => [...prev, scene]);
    return scene;
  }, []);

  const rename = useCallback(async (id: string, name: string) => {
    setScenes((prev) => {
      const scene = prev.find((s) => s.id === id);
      if (!scene) return prev;
      const updated = { ...scene, name };
      void put(updated);
      return prev.map((s) => (s.id === id ? updated : s));
    });
  }, []);

  const remove = useCallback(async (id: string) => {
    await del(id);
    setScenes((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { scenes, loaded, addFromFile, rename, remove, refresh };
}
