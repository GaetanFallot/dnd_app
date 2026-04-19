import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — configure client/.env',
  );
}

export const supabase: SupabaseClient<Database> = createClient<Database>(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
