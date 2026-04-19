import {
  useCampaignShareToken,
  useGenerateShareToken,
  useRevokeShareToken,
  useCampaignPlayers,
  useRemoveCampaignPlayer,
} from '@/hooks/useCampaigns';
import { Copy, Link as LinkIcon, RefreshCw, Trash2, Loader2, ShieldOff } from 'lucide-react';
import { useState } from 'react';

interface Props {
  campaignId: string;
}

export function CampaignSharePanel({ campaignId }: Props) {
  const shareQuery = useCampaignShareToken(campaignId);
  const players = useCampaignPlayers(campaignId);
  const generate = useGenerateShareToken();
  const revoke = useRevokeShareToken();
  const removePlayer = useRemoveCampaignPlayer();
  const [copied, setCopied] = useState<'token' | 'lore' | null>(null);

  const token = shareQuery.data?.token;
  const publicLoreUrl = token ? `${window.location.origin}/lore/${token}` : null;

  const copy = async (text: string, kind: 'token' | 'lore') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt('Copie ce texte :', text);
    }
  };

  return (
    <section className="panel p-4 space-y-4">
      <h2 className="heading-rune text-sm flex items-center gap-2">
        <LinkIcon className="w-4 h-4 text-gold" /> Partage & joueurs
      </h2>

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Donne le <b>code</b> à tes joueurs (ils le collent dans "Rejoindre avec un code"), ou
          partage le <b>lien public</b> du lore (lecture seule, limité aux entités marquées publiques).
        </div>

        {shareQuery.isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-gold" />
        ) : token ? (
          <div className="grid gap-2 md:grid-cols-2">
            <div className="bg-night-deep/60 rounded px-3 py-2 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Code invitation</div>
                <div className="font-mono text-sm text-gold truncate">{token}</div>
              </div>
              <button
                type="button"
                onClick={() => copy(token, 'token')}
                className="btn-rune text-xs px-2 py-1"
              >
                <Copy className="w-3 h-3" /> {copied === 'token' ? '✓' : 'Copier'}
              </button>
            </div>

            {publicLoreUrl && (
              <div className="bg-night-deep/60 rounded px-3 py-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Lien public du lore</div>
                  <div className="font-mono text-xs text-gold truncate">{publicLoreUrl}</div>
                </div>
                <button
                  type="button"
                  onClick={() => copy(publicLoreUrl, 'lore')}
                  className="btn-rune text-xs px-2 py-1"
                >
                  <Copy className="w-3 h-3" /> {copied === 'lore' ? '✓' : 'Copier'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="italic text-muted-foreground text-sm">Aucun code actif.</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => generate.mutate(campaignId)}
            disabled={generate.isPending}
            className="btn-rune text-xs"
          >
            {generate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {token ? 'Régénérer' : 'Générer un code'}
          </button>
          {token && (
            <button
              type="button"
              onClick={() => revoke.mutate(campaignId)}
              disabled={revoke.isPending}
              className="btn-blood text-xs"
            >
              <ShieldOff className="w-3 h-3" /> Révoquer
            </button>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-border/40 space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Joueurs inscrits ({players.data?.length ?? 0})
        </div>
        {players.isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-gold" />
        ) : !players.data?.length ? (
          <p className="text-xs italic text-muted-foreground">Aucun joueur rattaché.</p>
        ) : (
          <ul className="space-y-1">
            {players.data.map((p) => (
              <li key={p.id} className="flex items-center gap-2 bg-night-deep/40 rounded px-2 py-1 text-sm">
                <span className="font-display text-parchment flex-1 truncate">
                  {p.display_name ?? p.email ?? p.user_id}
                </span>
                <span className="text-[10px] text-muted-foreground italic">{p.role}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Retirer ${p.display_name ?? p.email ?? 'ce joueur'} ?`)) {
                      removePlayer.mutate({ campaignId, userId: p.user_id });
                    }
                  }}
                  className="text-blood hover:text-blood-light"
                  title="Retirer de la campagne"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
