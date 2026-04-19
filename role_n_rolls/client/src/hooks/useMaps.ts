/**
 * Maps + annotations (Phase F).
 *
 * A map is a single image (URL) with N annotations. Each annotation has
 * relative x/y (0..1) on the image, an optional linked lore entity, and an
 * is_public flag — only public annotations show on the public lore page.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface MapRow {
  id: string;
  campaign_id: string;
  title: string;
  image_url: string;
  is_public: boolean;
  created_at: string;
}

export interface MapAnnotationRow {
  id: string;
  map_id: string;
  x: number;
  y: number;
  label: string;
  description: string | null;
  linked_entity_id: string | null;
  is_public: boolean;
}

const MAPS_KEY = (campaignId: string) => ['maps', campaignId] as const;
const ANNOT_KEY = (mapId: string) => ['maps', 'annotations', mapId] as const;

export function useMaps(campaignId: string | undefined) {
  return useQuery({
    queryKey: MAPS_KEY(campaignId ?? ''),
    enabled: !!campaignId,
    queryFn: async (): Promise<MapRow[]> => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MapRow[];
    },
  });
}

export function useCreateMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      campaignId: string;
      title: string;
      image_url: string;
      is_public?: boolean;
    }): Promise<MapRow> => {
      const { data, error } = await supabase
        .from('maps')
        .insert({
          campaign_id: args.campaignId,
          title: args.title,
          image_url: args.image_url,
          is_public: args.is_public ?? false,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as MapRow;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: MAPS_KEY(args.campaignId) }),
  });
}

export function useUpdateMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      campaignId: string;
      patch: Partial<Pick<MapRow, 'title' | 'image_url' | 'is_public'>>;
    }) => {
      const { error } = await supabase.from('maps').update(args.patch).eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: MAPS_KEY(args.campaignId) }),
  });
}

export function useDeleteMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; campaignId: string }) => {
      const { error } = await supabase.from('maps').delete().eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: MAPS_KEY(args.campaignId) }),
  });
}

// ─── Annotations ─────────────────────────────────────────────────────────────

export function useMapAnnotations(mapId: string | undefined) {
  return useQuery({
    queryKey: ANNOT_KEY(mapId ?? ''),
    enabled: !!mapId,
    queryFn: async (): Promise<MapAnnotationRow[]> => {
      if (!mapId) return [];
      const { data, error } = await supabase
        .from('map_annotations')
        .select('*')
        .eq('map_id', mapId);
      if (error) throw error;
      return (data ?? []) as MapAnnotationRow[];
    },
  });
}

export function useCreateMapAnnotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      map_id: string;
      x: number;
      y: number;
      label: string;
      description?: string;
      linked_entity_id?: string | null;
      is_public?: boolean;
    }) => {
      const { error } = await supabase.from('map_annotations').insert({
        map_id: args.map_id,
        x: args.x,
        y: args.y,
        label: args.label,
        description: args.description ?? null,
        linked_entity_id: args.linked_entity_id ?? null,
        is_public: args.is_public ?? false,
      });
      if (error) throw error;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: ANNOT_KEY(args.map_id) }),
  });
}

export function useUpdateMapAnnotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      map_id: string;
      patch: Partial<Pick<MapAnnotationRow, 'label' | 'description' | 'linked_entity_id' | 'is_public' | 'x' | 'y'>>;
    }) => {
      const { error } = await supabase.from('map_annotations').update(args.patch).eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: ANNOT_KEY(args.map_id) }),
  });
}

export function useDeleteMapAnnotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; map_id: string }) => {
      const { error } = await supabase.from('map_annotations').delete().eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: ANNOT_KEY(args.map_id) }),
  });
}
