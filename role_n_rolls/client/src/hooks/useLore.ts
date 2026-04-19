/**
 * Lore hooks (Phase E) — entities, relations, events.
 * All scoped to a single campaign_id; RLS enforces membership.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import type { LoreEntityType } from '@/types/supabase';

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

// ─── Entities ────────────────────────────────────────────────────────────────

export function useLoreEntities(campaignId: string | undefined) {
  return useQuery({
    queryKey: ENTITIES_KEY(campaignId ?? ''),
    enabled: !!campaignId,
    queryFn: async (): Promise<LoreEntityRow[]> => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from('lore_entities')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name');
      if (error) throw error;
      return (data ?? []) as LoreEntityRow[];
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
      patch: Partial<Pick<LoreEntityRow, 'type' | 'name' | 'description' | 'image_url' | 'is_public'>>;
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
  return useQuery({
    queryKey: RELATIONS_KEY(campaignId ?? ''),
    enabled: !!campaignId,
    queryFn: async (): Promise<LoreRelationRow[]> => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from('lore_relations')
        .select('*')
        .eq('campaign_id', campaignId);
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
  return useQuery({
    queryKey: EVENTS_KEY(campaignId ?? ''),
    enabled: !!campaignId,
    queryFn: async (): Promise<LoreEventRow[]> => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from('lore_events')
        .select('*, lore_event_entities(entity_id)')
        .eq('campaign_id', campaignId)
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
