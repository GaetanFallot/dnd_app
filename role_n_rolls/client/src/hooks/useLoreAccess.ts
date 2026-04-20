/**
 * Per-entity player access grants. Uses the existing
 * `lore_player_access` table (target_type='entity'); no new migration.
 *
 * Rules:
 *   - An entity with `is_public = true` is visible to every campaign
 *     member; grants don't matter.
 *   - An entity with `is_public = false` is MJ-only by default; grants
 *     selectively share it with named players.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';

export interface EntityAccessRow {
  id: string;
  entity_id: string;
  user_id: string;
  granted_at: string;
}

const KEY = (entityId: string) => ['lore-access', entityId] as const;

export function useEntityAccess(
  campaignId: string | undefined,
  entityId: string | undefined,
) {
  return useQuery({
    queryKey: KEY(entityId ?? ''),
    enabled: !!campaignId && !!entityId,
    queryFn: async (): Promise<EntityAccessRow[]> => {
      if (!campaignId || !entityId) return [];
      const { data, error } = await supabase
        .from('lore_player_access')
        .select('id, user_id, granted_at')
        .eq('campaign_id', campaignId)
        .eq('target_type', 'entity')
        .eq('target_id', entityId);
      if (error) throw error;
      return ((data ?? []) as Array<{ id: string; user_id: string; granted_at: string }>).map((r) => ({
        id: r.id,
        entity_id: entityId,
        user_id: r.user_id,
        granted_at: r.granted_at,
      }));
    },
  });
}

export function useGrantEntityAccess() {
  const qc = useQueryClient();
  const granterId = useAuth((s) => s.user?.id);
  return useMutation({
    mutationFn: async (args: { campaignId: string; entityId: string; userId: string }) => {
      if (!granterId) throw new Error('Pas de session active');
      const { error } = await supabase.from('lore_player_access').insert({
        campaign_id: args.campaignId,
        target_type: 'entity',
        target_id: args.entityId,
        user_id: args.userId,
        granted_by: granterId,
      });
      if (error && !('code' in error && (error as { code: string }).code === '23505')) throw error;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: KEY(args.entityId) }),
  });
}

export function useRevokeEntityAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { campaignId: string; entityId: string; userId: string }) => {
      const { error } = await supabase
        .from('lore_player_access')
        .delete()
        .eq('campaign_id', args.campaignId)
        .eq('target_type', 'entity')
        .eq('target_id', args.entityId)
        .eq('user_id', args.userId);
      if (error) throw error;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: KEY(args.entityId) }),
  });
}
