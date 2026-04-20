/**
 * Lore hooks (Phase E) — entities, relations, events.
 * All scoped to a single campaign_id; RLS enforces membership.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { useLoreOverrides } from '@/hooks/useLoreOverrides';
import type { LoreEntityType } from '@/types/supabase';

export interface LoreMetaRow { k: string; v: string }
export interface LoreStatRow { k: string; v: number; c?: 'gold' | 'red' | 'green' | 'blue' | 'purple' }
export interface LoreCustomData {
  meta?: LoreMetaRow[];
  stats?: LoreStatRow[];
  tags?: string[];
}

export interface LoreEntityRow {
  id: string;
  campaign_id: string;
  type: LoreEntityType;
  name: string;
  description: string | null;
  image_url: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  custom_data?: LoreCustomData | null;
}

export interface LoreRelationRow {
  id: string;
  campaign_id: string;
  entity_a_id: string;
  entity_b_id: string;
  relation_label: string;
}

export interface LoreEventRow {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
  linked_entity_ids: string[];
}

const ENTITIES_KEY = (campaignId: string) => ['lore', campaignId, 'entities'] as const;
const RELATIONS_KEY = (campaignId: string) => ['lore', campaignId, 'relations'] as const;
const EVENTS_KEY = (campaignId: string) => ['lore', campaignId, 'events'] as const;
const SOURCES_KEY = (campaignId: string) => ['lore', campaignId, 'sources'] as const;

/**
 * Returns every campaign whose lore the active campaign should display:
 * its own + any campaigns linked via `campaign_libraries`. Falls back to
 * `[campaignId]` if the RPC or the table is missing (older DBs).
 */
async function resolveLoreSources(campaignId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('campaign_lore_sources', {
    p_campaign_id: campaignId,
  });
  if (error || !data) return [campaignId];
  // Returns setof uuid → PostgREST usually serialises as string[], but some
  // configurations wrap each row as `{ campaign_lore_sources: uuid }`.
  const unknownData = data as unknown;
  if (Array.isArray(unknownData) && unknownData.length && typeof unknownData[0] === 'object' && unknownData[0] !== null) {
    return (unknownData as Array<Record<string, string>>)
      .map((row) => Object.values(row)[0])
      .filter(Boolean);
  }
  return (unknownData as string[] | null) ?? [campaignId];
}

// ─── Entities ────────────────────────────────────────────────────────────────

export function useLoreSources(campaignId: string | undefined) {
  return useQuery({
    queryKey: SOURCES_KEY(campaignId ?? ''),
    enabled: !!campaignId,
    queryFn: () => (campaignId ? resolveLoreSources(campaignId) : Promise.resolve([])),
  });
}

export function useLoreEntities(campaignId: string | undefined) {
  const sources = useLoreSources(campaignId);
  const overrides = useLoreOverrides(campaignId);
  return useQuery({
    queryKey: [
      ...ENTITIES_KEY(campaignId ?? ''),
      (sources.data ?? []).join(','),
      Object.keys(overrides.data ?? {}).length,
    ],
    enabled: !!campaignId && !!sources.data,
    queryFn: async (): Promise<LoreEntityRow[]> => {
      if (!campaignId) return [];
      const ids = sources.data?.length ? sources.data : [campaignId];
      const { data, error } = await supabase
        .from('lore_entities')
        .select('*')
        .in('campaign_id', ids)
        .order('name');
      if (error) throw error;
      const hidden = new Set(
        Object.values(overrides.data ?? {})
          .filter((o) => o.is_hidden)
          .map((o) => o.entity_id),
      );
      return ((data ?? []) as LoreEntityRow[]).filter((e) => !hidden.has(e.id));
    },
  });
}

export function useCreateLoreEntity() {
  const qc = useQueryClient();
  const userId = useAuth((s) => s.user?.id);
  return useMutation({
    mutationFn: async (args: {
      campaignId: string;
      type: LoreEntityType;
      name: string;
      description?: string;
      image_url?: string;
      is_public?: boolean;
    }): Promise<LoreEntityRow> => {
      if (!userId) throw new Error('Pas de session active');
      const { data, error } = await supabase
        .from('lore_entities')
        .insert({
          campaign_id: args.campaignId,
          type: args.type,
          name: args.name,
          description: args.description ?? null,
          image_url: args.image_url ?? null,
          is_public: args.is_public ?? false,
          created_by: userId,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as LoreEntityRow;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: ENTITIES_KEY(args.campaignId) }),
  });
}

export function useUpdateLoreEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      campaignId: string;
      patch: Partial<Pick<LoreEntityRow, 'type' | 'name' | 'description' | 'image_url' | 'is_public' | 'custom_data'>>;
    }) => {
      const { error } = await supabase.from('lore_entities').update(args.patch).eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: ENTITIES_KEY(args.campaignId) }),
  });
}

export function useDeleteLoreEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; campaignId: string }) => {
      const { error } = await supabase.from('lore_entities').delete().eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: (_, args) => {
      qc.invalidateQueries({ queryKey: ENTITIES_KEY(args.campaignId) });
      qc.invalidateQueries({ queryKey: RELATIONS_KEY(args.campaignId) });
      qc.invalidateQueries({ queryKey: EVENTS_KEY(args.campaignId) });
    },
  });
}

// ─── Relations ───────────────────────────────────────────────────────────────

export function useLoreRelations(campaignId: string | undefined) {
  const sources = useLoreSources(campaignId);
  return useQuery({
    queryKey: [...RELATIONS_KEY(campaignId ?? ''), (sources.data ?? []).join(',')],
    enabled: !!campaignId && !!sources.data,
    queryFn: async (): Promise<LoreRelationRow[]> => {
      if (!campaignId) return [];
      const ids = sources.data?.length ? sources.data : [campaignId];
      const { data, error } = await supabase
        .from('lore_relations')
        .select('*')
        .in('campaign_id', ids);
      if (error) throw error;
      return (data ?? []) as LoreRelationRow[];
    },
  });
}

export function useCreateLoreRelation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      campaignId: string;
      entity_a_id: string;
      entity_b_id: string;
      relation_label: string;
    }) => {
      const { error } = await supabase.from('lore_relations').insert({
        campaign_id: args.campaignId,
        entity_a_id: args.entity_a_id,
        entity_b_id: args.entity_b_id,
        relation_label: args.relation_label,
      });
      if (error) throw error;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: RELATIONS_KEY(args.campaignId) }),
  });
}

export function useDeleteLoreRelation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; campaignId: string }) => {
      const { error } = await supabase.from('lore_relations').delete().eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: RELATIONS_KEY(args.campaignId) }),
  });
}

// ─── Events ──────────────────────────────────────────────────────────────────

export function useLoreEvents(campaignId: string | undefined) {
  const sources = useLoreSources(campaignId);
  return useQuery({
    queryKey: [...EVENTS_KEY(campaignId ?? ''), (sources.data ?? []).join(',')],
    enabled: !!campaignId && !!sources.data,
    queryFn: async (): Promise<LoreEventRow[]> => {
      if (!campaignId) return [];
      const ids = sources.data?.length ? sources.data : [campaignId];
      const { data, error } = await supabase
        .from('lore_events')
        .select('*, lore_event_entities(entity_id)')
        .in('campaign_id', ids)
        .order('created_at', { ascending: false });
      if (error) throw error;
      type Joined = {
        id: string;
        campaign_id: string;
        title: string;
        description: string | null;
        is_public: boolean;
        created_by: string;
        created_at: string;
        lore_event_entities: Array<{ entity_id: string }>;
      };
      return ((data ?? []) as unknown as Joined[]).map((row) => ({
        id: row.id,
        campaign_id: row.campaign_id,
        title: row.title,
        description: row.description,
        is_public: row.is_public,
        created_by: row.created_by,
        created_at: row.created_at,
        linked_entity_ids: (row.lore_event_entities ?? []).map((l) => l.entity_id),
      }));
    },
  });
}

export function useCreateLoreEvent() {
  const qc = useQueryClient();
  const userId = useAuth((s) => s.user?.id);
  return useMutation({
    mutationFn: async (args: {
      campaignId: string;
      title: string;
      description?: string;
      is_public?: boolean;
      entity_ids?: string[];
    }): Promise<LoreEventRow> => {
      if (!userId) throw new Error('Pas de session active');
      const { data, error } = await supabase
        .from('lore_events')
        .insert({
          campaign_id: args.campaignId,
          title: args.title,
          description: args.description ?? null,
          is_public: args.is_public ?? false,
          created_by: userId,
        })
        .select('*')
        .single();
      if (error) throw error;
      const event = data as Omit<LoreEventRow, 'linked_entity_ids'>;
      if (args.entity_ids?.length) {
        const links = args.entity_ids.map((eid) => ({ event_id: event.id, entity_id: eid }));
        const { error: lerr } = await supabase.from('lore_event_entities').insert(links);
        if (lerr) throw lerr;
      }
      return { ...event, linked_entity_ids: args.entity_ids ?? [] };
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: EVENTS_KEY(args.campaignId) }),
  });
}

export function useUpdateLoreEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      campaignId: string;
      patch: Partial<Pick<LoreEventRow, 'title' | 'description' | 'is_public'>>;
      entity_ids?: string[];
    }) => {
      if (Object.keys(args.patch).length) {
        const { error } = await supabase.from('lore_events').update(args.patch).eq('id', args.id);
        if (error) throw error;
      }
      if (args.entity_ids) {
        // Replace the full link set — cheaper than diffing, and the table is small.
        await supabase.from('lore_event_entities').delete().eq('event_id', args.id);
        if (args.entity_ids.length) {
          const links = args.entity_ids.map((eid) => ({ event_id: args.id, entity_id: eid }));
          const { error } = await supabase.from('lore_event_entities').insert(links);
          if (error) throw error;
        }
      }
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: EVENTS_KEY(args.campaignId) }),
  });
}

export function useDeleteLoreEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; campaignId: string }) => {
      const { error } = await supabase.from('lore_events').delete().eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: EVENTS_KEY(args.campaignId) }),
  });
}
