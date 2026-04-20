/**
 * Per-campaign overrides for linked lore entities — lets the target MJ hide
 * an imported entity or attach a private note without editing the source.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';

export interface LoreEntityOverride {
  campaign_id: string;
  entity_id: string;
  is_hidden: boolean;
  local_note: string | null;
  updated_at: string;
}

const KEY = (campaignId: string) => ['lore', campaignId, 'overrides'] as const;

export function useLoreOverrides(campaignId: string | undefined) {
  return useQuery({
    queryKey: KEY(campaignId ?? ''),
    enabled: !!campaignId,
    queryFn: async (): Promise<Record<string, LoreEntityOverride>> => {
      if (!campaignId) return {};
      const { data, error } = await supabase
        .from('lore_entity_overrides')
        .select('*')
        .eq('campaign_id', campaignId);
      if (error) throw error;
      const out: Record<string, LoreEntityOverride> = {};
      for (const row of (data ?? []) as LoreEntityOverride[]) {
        out[row.entity_id] = row;
      }
      return out;
    },
  });
}

export function useUpsertLoreOverride() {
  const qc = useQueryClient();
  const userId = useAuth((s) => s.user?.id);
  return useMutation({
    mutationFn: async (args: {
      campaignId: string;
      entityId: string;
      patch: Partial<Pick<LoreEntityOverride, 'is_hidden' | 'local_note'>>;
    }) => {
      const { error } = await supabase
        .from('lore_entity_overrides')
        .upsert(
          {
            campaign_id: args.campaignId,
            entity_id: args.entityId,
            ...args.patch,
            updated_by: userId ?? null,
          },
          { onConflict: 'campaign_id,entity_id' },
        );
      if (error) throw error;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: KEY(args.campaignId) }),
  });
}

export function useDeleteLoreOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { campaignId: string; entityId: string }) => {
      const { error } = await supabase
        .from('lore_entity_overrides')
        .delete()
        .eq('campaign_id', args.campaignId)
        .eq('entity_id', args.entityId);
      if (error) throw error;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: KEY(args.campaignId) }),
  });
}
