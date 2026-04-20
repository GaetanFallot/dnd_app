/**
 * Uploads image files to the `lore-images` Supabase Storage bucket and
 * returns a public URL. Falls back to a base64 data URL if the bucket is
 * missing or RLS rejects the write (so the UI never breaks when migration
 * 0004_storage.sql has not yet been applied).
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';

const BUCKET = 'lore-images';

export interface UploadedImage {
  url: string;
  /** true when we fell back to a local base64 representation. */
  isFallback: boolean;
}

function fileExt(name: string): string {
  const m = name.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : 'bin';
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(file: File, userId: string): Promise<UploadedImage> {
  const path = `${userId}/${crypto.randomUUID()}.${fileExt(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) {
    // Bucket missing / RLS forbidden / network error — fall back so the
    // user still sees their image locally.
    console.warn('[upload] falling back to data URL:', error.message);
    const url = await fileToDataUrl(file);
    return { url, isFallback: true };
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, isFallback: false };
}

export function useImageUpload() {
  const userId = useAuth((s) => s.user?.id);
  return useMutation({
    mutationFn: async (file: File): Promise<UploadedImage> => {
      if (!userId) throw new Error('Pas de session active');
      return uploadImage(file, userId);
    },
  });
}
