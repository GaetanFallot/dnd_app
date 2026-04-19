import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCampaigns,
  useCreateCampaign,
  useDeleteCampaign,
  useJoinCampaignByToken,
  type CampaignSummary,
} from '@/hooks/useCampaigns';
import { useSession } from '@/stores/session';
import { useAuth } from '@/stores/auth';
import { cn } from '@/lib/utils';
import {
  Crown,
  Users as UsersIcon,
  Plus,
  Trash2,
  Check,
  Loader2,
  Sparkles,
  LogIn,
  Swords,
} from 'lucide-react';
import { CampaignSharePanel } from './CampaignSharePanel';

export function SessionPage() {
  const list = useCampaigns();
  const createM = useCreateCampaign();
  const joinM = useJoinCampaignByToken();
  const removeM = useDeleteCampaign();
  const { activeCampaignId, setActiveCampaign } = useSession();
  const userId = useAuth((s) => s.user?.id);
  const nav = useNavigate();

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [joinToken, setJoinToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const campaigns = list.data ?? [];
  const mjCampaigns = campaigns.filter((c) => c.is_mj);
  const playerCampaigns = campaigns.filter((c) => !c.is_mj);
  const active = campaigns.find((c) => c.id === activeCampaignId) ?? null;

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const c = await createM.mutateAsync({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
      });
      setNewTitle('');
      setNewDesc('');
      setActiveCampaign(c.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const submitJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { campaignId } = await joinM.mutateAsync(joinToken.trim());
      setJoinToken('');
      setActiveCampaign(campaignId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <header className="flex items-center gap-3 flex-wrap">
        <h1 className="heading-rune text-3xl flex-1">🎲 Parties</h1>
        {active && (
          <div className="panel px-3 py-1.5 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs uppercase tracking-wider">Active</span>
            <span className="font-display text-gold">{active.title}</span>
            {active.is_mj && <Crown className="w-3 h-3 text-gold" />}
          </div>
        )}
      </header>

      {error && (
        <div className="panel p-3 border-blood/40 text-blood text-sm">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={submitCreate} className="panel p-4 space-y-3">
          <div className="heading-rune text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" /> Créer une campagne (MJ)
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Titre</span>
            <input
              required
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Description (optionnelle)</span>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              className="bg-input border border-border/60 rounded px-2 py-1 text-sm resize-y focus:outline-none focus:border-gold"
            />
          </label>
          <button
            type="submit"
            disabled={createM.isPending || !newTitle.trim()}
            className="btn-rune w-full disabled:opacity-40"
          >
            {createM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Créer
          </button>
        </form>

        <form onSubmit={submitJoin} className="panel p-4 space-y-3">
          <div className="heading-rune text-sm flex items-center gap-2">
            <LogIn className="w-4 h-4 text-gold" /> Rejoindre avec un code
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Code de partage</span>
            <input
              required
              type="text"
              value={joinToken}
              onChange={(e) => setJoinToken(e.target.value)}
              placeholder="Ex: x8Bp9kQmNw2RtV"
              className="bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold font-mono"
            />
          </label>
          <button
            type="submit"
            disabled={joinM.isPending || !joinToken.trim()}
            className="btn-rune w-full disabled:opacity-40"
          >
            {joinM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Rejoindre
          </button>
          <p className="text-[10px] text-muted-foreground">
            Le code te rattache à la campagne en tant que joueur.
          </p>
        </form>
      </div>

      {list.isLoading ? (
        <div className="panel p-8 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gold" />
          <p className="italic mt-2">Chargement des campagnes…</p>
        </div>
      ) : list.isError ? (
        <div className="panel p-6 text-center text-blood border-blood/40">
          Erreur : {(list.error as Error).message}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="panel p-8 text-center text-muted-foreground italic">
          Aucune campagne pour le moment — crée-en une ou rejoins-en une.
        </div>
      ) : (
        <>
          {mjCampaigns.length > 0 && (
            <section className="space-y-3">
              <h2 className="heading-rune text-lg flex items-center gap-2">
                <Crown className="w-5 h-5 text-gold" /> Tes campagnes (MJ)
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {mjCampaigns.map((c) => (
                  <CampaignCard
                    key={c.id}
                    c={c}
                    isActive={c.id === activeCampaignId}
                    onActivate={() => setActiveCampaign(c.id)}
                    onOpenLore={() => { setActiveCampaign(c.id); nav('/lore'); }}
                    onOpenMaps={() => { setActiveCampaign(c.id); nav('/maps'); }}
                    onOpenMJ={() => { setActiveCampaign(c.id); nav('/mj'); }}
                    onDelete={() => {
                      if (window.confirm(`Supprimer "${c.title}" ? Les entités, maps et joueurs seront retirés.`)) {
                        removeM.mutate(c.id, {
                          onSuccess: () => {
                            if (c.id === activeCampaignId) setActiveCampaign(null);
                          },
                        });
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {playerCampaigns.length > 0 && (
            <section className="space-y-3">
              <h2 className="heading-rune text-lg flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-gold" /> Joueur
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {playerCampaigns.map((c) => (
                  <CampaignCard
                    key={c.id}
                    c={c}
                    isActive={c.id === activeCampaignId}
                    onActivate={() => setActiveCampaign(c.id)}
                    onOpenLore={() => { setActiveCampaign(c.id); nav('/lore'); }}
                    onOpenMaps={() => { setActiveCampaign(c.id); nav('/maps'); }}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {active?.is_mj && active.mj_user_id === userId && (
        <CampaignSharePanel campaignId={active.id} />
      )}
    </div>
  );
}

function CampaignCard({
  c,
  isActive,
  onActivate,
  onOpenLore,
  onOpenMaps,
  onOpenMJ,
  onDelete,
}: {
  c: CampaignSummary;
  isActive: boolean;
  onActivate: () => void;
  onOpenLore: () => void;
  onOpenMaps: () => void;
  onOpenMJ?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article
      className={cn(
        'panel p-4 space-y-2 transition-colors',
        isActive && 'border-gold shadow-[0_0_14px_rgba(201,168,76,0.25)]',
      )}
    >
      <header className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-gold text-lg truncate">{c.title}</h3>
          {c.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{c.description}</p>
          )}
        </div>
        {c.is_mj && <Crown className="w-4 h-4 text-gold shrink-0" />}
      </header>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>{c.player_count} joueur{c.player_count > 1 ? 's' : ''}</span>
        <span>·</span>
        <span className="italic">{c.status}</span>
      </div>

      <div className="flex flex-wrap gap-1 pt-1">
        <button
          type="button"
          onClick={onActivate}
          className={cn('btn-rune text-[10px] px-2 py-1', isActive && 'bg-gold/15 border-gold text-gold')}
        >
          {isActive ? <><Check className="w-3 h-3" /> Active</> : 'Activer'}
        </button>
        <button type="button" onClick={onOpenLore} className="btn-rune text-[10px] px-2 py-1">Lore</button>
        <button type="button" onClick={onOpenMaps} className="btn-rune text-[10px] px-2 py-1">Cartes</button>
        {onOpenMJ && (
          <button type="button" onClick={onOpenMJ} className="btn-rune text-[10px] px-2 py-1">
            <Swords className="w-3 h-3" /> MJ
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="btn-blood text-[10px] px-2 py-1 ml-auto"
            title="Supprimer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </article>
  );
}
