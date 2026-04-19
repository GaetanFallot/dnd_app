/**
 * Character CRUD hooks backed by Supabase `public.characters`.
 *
 * Each row is owned by `user_id = auth.uid()` (RLS enforced). The character
 * payload lives in the `character_data` JSONB column as a `DnDCharacter`.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { blankCharacter } from '@/lib/helpers/dndRules';
import type { DnDCharacter } from '@/types/character';

export interface CharacterRecord {
  id: string;
  data: DnDCharacter;
  updatedAt: string;
}

const LIST_KEY = ['characters', 'list'] as const;
const DETAIL_KEY = (id: string) => ['characters', 'detail', id] as const;

type Row = {
  id: string;
  character_data: unknown;
  updated_at: string;
};

function toRecord(row: Row): CharacterRecord {
  return {
    id: row.id,
    data: row.character_data as DnDCharacter,
    updatedAt: row.updated_at,
  };
}

export function useCharactersList() {
  const userId = useAuth((s) => s.user?.id);
  return useQuery({
    queryKey: [...LIST_KEY, userId ?? 'anon'],
    enabled: !!userId,
    queryFn: async (): Promise<CharacterRecord[]> => {
      const { data, error } = await supabase
        .from('characters')
        .select('id, character_data, updated_at')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toRecord);
    },
  });
}

export function useCharacter(id: string | undefined) {
  const userId = useAuth((s) => s.user?.id);
  return useQuery({
    queryKey: id ? DETAIL_KEY(id) : ['characters', 'detail', 'none'],
    enabled: !!userId && !!id,
    queryFn: async (): Promise<CharacterRecord | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('characters')
        .select('id, character_data, updated_at')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data ? toRecord(data) : null;
    },
  });
}

export function useCreateCharacter() {
  const qc = useQueryClient();
  const userId = useAuth((s) => s.user?.id);
  return useMutation({
    mutationFn: async (): Promise<CharacterRecord> => {
      if (!userId) throw new Error('Pas de session active');
      const { data, error } = await supabase
        .from('characters')
        .insert({ user_id: userId, character_data: blankCharacter() })
        .select('id, character_data, updated_at')
        .single();
      if (error) throw error;
      return toRecord(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  });
}

export function useImportCharacter() {
  const qc = useQueryClient();
  const userId = useAuth((s) => s.user?.id);
  return useMutation({
    mutationFn: async (raw: DnDCharacter): Promise<CharacterRecord> => {
      if (!userId) throw new Error('Pas de session active');
      const merged = { ...blankCharacter(), ...raw };
      const { data, error } = await supabase
        .from('characters')
        .insert({ user_id: userId, character_data: merged })
        .select('id, character_data, updated_at')
        .single();
      if (error) throw error;
      return toRecord(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  });
}

export function useUpdateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; data: DnDCharacter }) => {
      const { error } = await supabase
        .from('characters')
        .update({ character_data: args.data })
        .eq('id', args.id);
      if (error) throw error;
    },
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: DETAIL_KEY(id) });
      const prevDetail = qc.getQueryData<CharacterRecord | null>(DETAIL_KEY(id));
      const now = new Date().toISOString();
      qc.setQueryData<CharacterRecord | null>(DETAIL_KEY(id), (old) =>
        old ? { ...old, data, updatedAt: now } : old,
      );
      qc.setQueriesData<CharacterRecord[]>({ queryKey: LIST_KEY }, (list) =>
        list?.map((r) => (r.id === id ? { ...r, data, updatedAt: now } : r)) ?? list,
      );
      return { prevDetail };
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.prevDetail !== undefined) qc.setQueryData(DETAIL_KEY(id), ctx.prevDetail);
    },
    onSettled: (_res, _err, { id }) => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
      void qc.invalidateQueries({ queryKey: DETAIL_KEY(id) });
    },
  });
}

export function useRemoveCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('characters').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['characters'] }),
  });
}
