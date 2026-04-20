import { useState } from 'react';
import {
  useCampaigns,
  useCampaignLibraries,
  useLinkCampaignLibrary,
  useUnlinkCampaignLibrary,
} from '@/hooks/useCampaigns';
import { BookMarked, Plus, Trash2, Loader2 } from 'lucide-react';

interface Props {
  campaignId: string;
}

/**
 * MJ-only panel: link other campaigns' lore (public entities) into this
 * campaign. Linked entities are read-only; edits still go to their owner.
 */
export function LinkedLibrariesPanel({ campaignId }: Props) {
  const all = useCampaigns();
  const linked = useCampaignLibraries(campaignId);
  const linkM = useLinkCampaignLibrary();
  const unlinkM = useUnlinkCampaignLibrary();
  const [picking, setPicking] = useState('');

  const linkedIds = new Set((linked.data ?? []).map((r) => r.source_campaign_id));
  const candidates = (all.data ?? []).filter(
    (c) => c.id !== campaignId && !linkedIds.has(c.id),
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!picking) return;
    linkM.mutate({ campaignId, sourceCampaignId: picking }, { onSuccess: () => setPicking('') });
  };

  return (
    <section className="panel p-4 space-y-3">
      <h2 className="heading-rune text-sm flex items-center gap-2">
        <BookMarked className="w-4 h-4 text-gold" /> Lore lié à cette campagne
      </h2>
      <p className="text-xs text-muted-foreground italic">
        Importe les entités publiques d'une autre campagne dans ce lore — utile pour réutiliser
        un univers entre plusieurs parties. Les modifications restent côté campagne source.
      </p>

      {linked.isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-gold" />
      ) : !linked.data?.length ? (
        <p className="text-xs italic text-muted-foreground">Aucune campagne liée.</p>
      ) : (
        <ul className="space-y-1.5">
          {linked.data.map((row) => (
            <li
              key={row.source_campaign_id}
              className="flex items-center gap-2 bg-night-deep/40 rounded px-3 py-2 text-sm"
            >
              <BookMarked className="w-3 h-3 text-gold shrink-0" />
              <span className="font-display text-parchment flex-1 truncate">
                {row.title ?? row.source_campaign_id}
              </span>
              <button
                type="button"
                onClick={() =>
                  unlinkM.mutate({ campaignId, sourceCampaignId: row.source_campaign_id })
                }
                className="text-blood hover:text-blood-light"
                title="Délier"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {candidates.length > 0 && (
        <form onSubmit={submit} className="flex gap-2 items-end pt-1">
          <label className="flex-1 flex flex-col gap-1 text-xs">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Importer depuis
            </span>
            <select
              value={picking}
              onChange={(e) => setPicking(e.target.value)}
              className="bg-input border border-border/60 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-gold"
            >
              <option value="">— Choisir une campagne —</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}{c.is_mj ? ' (MJ)' : ''}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={!picking || linkM.isPending}
            className="btn-rune text-xs disabled:opacity-40"
          >
            {linkM.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Lier
          </button>
        </form>
      )}
    </section>
  );
}
