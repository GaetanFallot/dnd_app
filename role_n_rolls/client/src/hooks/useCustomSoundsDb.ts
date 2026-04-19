/**
 * IndexedDB-backed store for user-imported soundboard clips.
 * Custom sounds are stored as Blobs (not dataURLs) to avoid the 5 MB
 * localStorage ceiling the legacy app kept hitting.
 */

import { useCallback, useEffect, useState } from 'react';

const DB_NAME = 'rnr_soundboard';
const STORE = 'sounds';
const DB_VERSION = 1;

export interface CustomSound {
  id: string;
  name: string;
  blob: Blob;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAll(): Promise<CustomSound[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result ?? []) as CustomSound[]);
    req.onerror = () => reject(req.error);
  });
}

async function put(sound: CustomSound): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(sound);
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

export function useCustomSoundsDb() {
  const [sounds, setSounds] = useState<CustomSound[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        setSounds(await getAll());
      } catch (err) {
        console.warn('[soundboard] load error', err);
      }
    })();
  }, []);

  const addFromFile = useCallback(async (file: File) => {
    const sound: CustomSound = {
      id: `cs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: file.name.replace(/\.[^.]+$/, '').slice(0, 32),
      blob: file,
      createdAt: Date.now(),
    };
    await put(sound);
    setSounds((prev) => [...prev, sound]);
    return sound;
  }, []);

  const remove = useCallback(async (id: string) => {
    await del(id);
    setSounds((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { sounds, addFromFile, remove };
}
