/**
 * Campaign + membership + share-token hooks (Phase G).
 *
 * A user is a MJ of every campaign where `campaigns.mj_user_id = auth.uid()`,
 * and a player of every campaign where they have a row in `campaign_players`.
 * RLS already enforces the right reads per role.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import type { CampaignStatus, CampaignRole } from '@/types/supabase';

export interface CampaignRow {
  id: string;
  title: string;
  description: string | null;
  mj_user_id: string;
  status: CampaignStatus;
  created_at: string;
}

export interface CampaignPlayerRow {
  id: string;
  campaign_id: string;
  user_id: string;
  role: CampaignRole;
  joined_at: string;
}

export interface CampaignSummary extends CampaignRow {
  is_mj: boolean;
  player_count: number;
}

const CAMPAIGNS_KEY = ['campaigns'] as const;
const SHARE_KEY = (id: string) => ['campaigns', id, 'share'] as const;
const PLAYERS_KEY = (id: string) => ['campaigns', id, 'players'] as const;

export function useCampaigns() {
  const userId = useAuth((s) => s.user?.id);
  return useQuery({
    queryKey: [...CAMPAIGNS_KEY, userId ?? 'anon'],
    enabled: !!userId,
    queryFn: async (): Promise<CampaignSummary[]> => {
      // RLS already filters to member campaigns.
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, description, mj_user_id, status, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const campaigns = (data ?? []) as CampaignRow[];
      if (!campaigns.length) return [];
      const { data: players } = await supabase
        .from('campaign_players')
        .select('campaign_id')
        .in('campaign_id', campaigns.map((c) => c.id));
      const counts = new Map<string, number>();
      (players ?? []).forEach((p) => {
        counts.set(p.campaign_id, (counts.get(p.campaign_id) ?? 0) + 1);
      });
      return campaigns.map((c) => ({
        ...c,
        is_mj: c.mj_user_id === userId,
        player_count: counts.get(c.id) ?? 0,
      }));
    },
  });
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: [...CAMPAIGNS_KEY, 'one', id ?? ''],
    enabled: !!id,
    queryFn: async (): Promise<CampaignRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, description, mj_user_id, status, created_at')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data as CampaignRow) ?? null;
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  const userId = useAuth((s) => s.user?.id);
  return useMutation({
    mutationFn: async (args: { title: string; description?: string }): Promise<CampaignRow> => {
      if (!userId) throw new Error('Pas de session active');
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          title: args.title,
          description: args.description ?? null,
          mj_user_id: userId,
        })
        .select('id, title, description, mj_user_id, status, created_at')
        .single();
      if (error) throw error;
      return data as CampaignRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; patch: Partial<Pick<CampaignRow, 'title' | 'description' | 'status'>> }) => {
      const { error } = await supabase.from('campaigns').update(args.patch).eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
  });
}

export function useJoinCampaignByToken() {
  const qc = useQueryClient();
  const userId = useAuth((s) => s.user?.id);
  return useMutation({
    mutationFn: async (token: string): Promise<{ campaignId: string }> => {
      if (!userId) throw new Error('Pas de session active');
      const { data: resolved, error: rerr } = await supabase.rpc('resolve_share_token', { p_token: token });
      if (rerr) throw rerr;
      const campaignId = resolved as unknown as string | null;
      if (!campaignId) throw new Error('Token invalide ou expiré');
      const { error } = await supabase
        .from('campaign_players')
        .insert({ campaign_id: campaignId, user_id: userId, role: 'player' });
      // 23505 = unique violation → déjà inscrit, on ignore.
      if (error && !('code' in error && (error as { code: string }).code === '23505')) throw error;
      return { campaignId };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY }),
  });
}

export function useCampaignPlayers(campaignId: string | undefined) {
  return useQuery({
    queryKey: PLAYERS_KEY(campaignId ?? ''),
    enabled: !!campaignId,
    queryFn: async (): Promise<Array<CampaignPlayerRow & { display_name: string | null; email: string | null }>> => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from('campaign_players')
        .select('id, campaign_id, user_id, role, joined_at, users(display_name, email)')
        .eq('campaign_id', campaignId);
      if (error) throw error;
      return (data ?? []).map((row) => {
        const u = (row as unknown as { users: { display_name: string | null; email: string | null } | null }).users;
        return {
          ...(row as CampaignPlayerRow),
          display_name: u?.display_name ?? null,
          email: u?.email ?? null,
        };
      });
    },
  });
}

export function useRemoveCampaignPlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { campaignId: string; userId: string }) => {
      const { error } = await supabase
        .from('campaign_players')
        .delete()
        .eq('campaign_id', args.campaignId)
        .eq('user_id', args.userId);
      if (error) throw error;
    },
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: PLAYERS_KEY(args.campaignId) }),
  });
}

// ─── Share tokens ────────────────────────────────────────────────────────────

export interface ShareTokenRow {
  id: string;
  campaign_id: string;
  token: string;
  is_active: boolean;
  created_at: string;
}

export function useCampaignShareToken(campaignId: string | undefined) {
  return useQuery({
    queryKey: SHARE_KEY(campaignId ?? ''),
    enabled: !!campaignId,
    queryFn: async (): Promise<ShareTokenRow | null> => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .from('campaign_share_tokens')
        .select('id, campaign_id, token, is_active, created_at')
        .eq('campaign_id', campaignId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as ShareTokenRow) ?? null;
    },
  });
}

function randomToken(): string {
  // 16-byte base62-ish — URL-safe and short enough for copy/paste.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const arr = new Uint8Array(14);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => alphabet[b % alphabet.length]).join('');
}

export function useGenerateShareToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string): Promise<ShareTokenRow> => {
      // Deactivate existing tokens first so only one is live.
      await supabase
        .from('campaign_share_tokens')
        .update({ is_active: false })
        .eq('campaign_id', campaignId)
        .eq('is_active', true);
      const { data, error } = await supabase
        .from('campaign_share_tokens')
        .insert({ campaign_id: campaignId, token: randomToken(), is_active: true })
        .select('id, campaign_id, token, is_active, created_at')
        .single();
      if (error) throw error;
      return data as ShareTokenRow;
    },
    onSuccess: (_, campaignId) => qc.invalidateQueries({ queryKey: SHARE_KEY(campaignId) }),
  });
}

export function useRevokeShareToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('campaign_share_tokens')
        .update({ is_active: false })
        .eq('campaign_id', campaignId)
        .eq('is_active', true);
      if (error) throw error;
    },
    onSuccess: (_, campaignId) => qc.invalidateQueries({ queryKey: SHARE_KEY(campaignId) }),
  });
}

// ─── Linked lore libraries (many-to-many between campaigns) ───────────────

export interface LinkedLibraryRow {
  source_campaign_id: string;
  added_at: string;
  title: string | null;
}

const LIBS_KEY = (campaignId: string) => ['campaigns', campaignId, 'libraries'] as const;

export function useCampaignLibraries(campaignId: string | undefined) {
  return useQuery({
    queryKey: LIBS_KEY(campaignId ?? ''),
    enabled: !!campaignId,
    queryFn: async (): Promise<LinkedLibraryRow[]> => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from('campaign_libraries')
        .select('source_campaign_id, added_at, campaigns:source_campaign_id(title)')
        .eq('campaign_id', campaignId);
      if (error) throw error;
      return ((data ?? []) as unknown as Array<{
        source_campaign_id: string;
        added_at: string;
        campaigns?: { title: string } | null;
      }>).map((r) => ({
        source_campaign_id: r.source_campaign_id,
        added_at: r.added_at,
        title: r.campaigns?.title ?? null,
      }));
    },
  });
}

export function useLinkCampaignLibrary() {
  const qc = useQueryClient();
  const userId = useAuth((s) => s.user?.id);
  return useMutation({
    mutationFn: async (args: { campaignId: string; sourceCampaignId: string }) => {
      if (!userId) throw new Error('Pas de session active');
      if (args.campaignId === args.sourceCampaignId) {
        throw new Error('Impossible de lier une campagne à elle-même');
      }
      const { error } = await supabase.from('campaign_libraries').insert({
        campaign_id: args.campaignId,
        source_campaign_id: args.sourceCampaignId,
        added_by: userId,
      });
      if (error && !('code' in error && (error as { code: string }).code === '23505')) throw error;
    },
    onSuccess: (_, args) => {
      qc.invalidateQueries({ queryKey: LIBS_KEY(args.campaignId) });
      qc.invalidateQueries({ queryKey: ['lore', args.campaignId] });
    },
  });
}

export function useUnlinkCampaignLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { campaignId: string; sourceCampaignId: string }) => {
      const { error } = await supabase
        .from('campaign_libraries')
        .delete()
        .eq('campaign_id', args.campaignId)
        .eq('source_campaign_id', args.sourceCampaignId);
      if (error) throw error;
    },
    onSuccess: (_, args) => {
      qc.invalidateQueries({ queryKey: LIBS_KEY(args.campaignId) });
      qc.invalidateQueries({ queryKey: ['lore', args.campaignId] });
    },
  });
}
