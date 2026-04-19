import { useMemo, useState } from 'react';
import { useSession } from '@/stores/session';
import { useAuth } from '@/stores/auth';
import { useCampaign } from '@/hooks/useCampaigns';
import {
  useLoreEntities,
  useCreateLoreEntity,
  useUpdateLoreEntity,
  useDeleteLoreEntity,
} from '@/hooks/useLore';
import { LORE_TYPE_META, LORE_TYPE_ORDER } from './meta';
import { EntityEditor } from './EntityEditor';
import { RelationsPanel } from './RelationsPanel';
import { EventsPanel } from './EventsPanel';
import { cn } from '@/lib/utils';
import { Plus, Search, Loader2, Link as LinkIcon, Globe, Lock, BookMarked, Activity } from 'lucide-react';
import type { LoreEntityType } from '@/types/supabase';
import { NoCampaignHint } from '@/components/shared/NoCampaignHint';

type Tab = 'entities' | 'relations' | 'events';

export function LoreBuilder() {
  const { activeCampaignId } = useSession();
  const campaign = useCampaign(activeCampaignId ?? undefined);
  const userId = useAuth((s) => s.user?.id);
  const isMj = campaign.data?.mj_user_id === userId;

  const entities = useLoreEntities(activeCampaignId ?? undefined);
  const createM = useCreateLoreEntity();
  const updateM = useUpdateLoreEntity();
  const deleteM = useDeleteLoreEntity();

  const [tab, setTab] = useState<Tab>('entities');
  const [filterType, setFilterType] = useState<LoreEntityType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = entities.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, filterType]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const createNew = async (type: LoreEntityType) => {
    if (!activeCampaignId) return;
    try {
      const rec = await createM.mutateAsync({
        campaignId: activeCampaignId,
        type,
        name: `Nouveau — ${LORE_TYPE_META[type].label}`,
      });
      setSelectedId(rec.id);
    } catch (err) {
      alert('Création impossible : ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (!activeCampaignId) {
    return <NoCampaignHint title="Lore Builder" />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="px-6 py-3 border-b border-border/60 flex items-center gap-3 flex-wrap">
        <h1 className="heading-rune text-2xl flex-1">📚 Lore — {campaign.data?.title ?? '…'}</h1>
        <nav className="flex gap-1 bg-night-deep/70 rounded p-0.5">
          {(
            [
              ['entities', 'Entités', BookMarked],
              ['relations', 'Relations', LinkIcon],
              ['events', 'Événements', Activity],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-display uppercase tracking-wider flex items-center gap-1.5',
                tab === id ? 'bg-gold/15 text-gold' : 'text-parchment/70 hover:text-parchment',
              )}
            >
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'entities' && (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <aside className="w-[280px] shrink-0 border-r border-border/60 flex flex-col">
            <div className="p-2 border-b border-border/60 space-y-2">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full bg-input border border-border/60 rounded pl-6 pr-2 py-1 text-sm focus:outline-none focus:border-gold"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                <TypePill
                  active={filterType === 'all'}
                  onClick={() => setFilterType('all')}
                  emoji="✨"
                  label={`Tout (${rows.length})`}
                />
                {LORE_TYPE_ORDER.map((t) => {
                  const count = rows.filter((r) => r.type === t).length;
                  if (!count && filterType !== t) return null;
                  return (
                    <TypePill
                      key={t}
                      active={filterType === t}
                      onClick={() => setFilterType(t)}
                      emoji={LORE_TYPE_META[t].emoji}
                      label={`${LORE_TYPE_META[t].label} (${count})`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {entities.isLoading ? (
                <div className="p-6 text-center"><Loader2 className="w-4 h-4 animate-spin text-gold mx-auto" /></div>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-xs italic text-muted-foreground text-center">
                  Aucune entité. {isMj && 'Utilise le menu ➕ pour en créer.'}
                </p>
              ) : (
                <ul>
                  {filtered.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(e.id)}
                        className={cn(
                          'w-full text-left px-3 py-2 flex items-center gap-2 text-sm border-l-2 hover:bg-gold/5',
                          selectedId === e.id
                            ? 'border-gold bg-gold/10 text-gold'
                            : 'border-transparent',
                        )}
                      >
                        <span className="text-base">{LORE_TYPE_META[e.type].emoji}</span>
                        <span className="flex-1 truncate">{e.name}</span>
                        {e.is_public ? (
                          <Globe className="w-3 h-3 text-emerald-400/70" aria-label="Public" />
                        ) : (
                          <Lock className="w-3 h-3 text-muted-foreground" aria-label="Privé" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isMj && (
              <div className="p-2 border-t border-border/60 flex flex-wrap gap-1">
                {LORE_TYPE_ORDER.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => createNew(t)}
                    className="btn-rune text-[10px] px-2 py-1"
                    title={`Ajouter ${LORE_TYPE_META[t].label}`}
                  >
                    <Plus className="w-3 h-3" /> {LORE_TYPE_META[t].emoji}
                  </button>
                ))}
              </div>
            )}
          </aside>

          <main className="flex-1 overflow-y-auto">
            {selected ? (
              <EntityEditor
                entity={selected}
                readOnly={!isMj}
                onPatch={(patch) =>
                  updateM.mutate({ id: selected.id, campaignId: selected.campaign_id, patch })
                }
                onDelete={() => {
                  if (window.confirm(`Supprimer "${selected.name}" ?`)) {
                    deleteM.mutate(
                      { id: selected.id, campaignId: selected.campaign_id },
                      { onSuccess: () => setSelectedId(null) },
                    );
                  }
                }}
              />
            ) : (
              <div className="p-10 text-center text-muted-foreground italic">
                Sélectionne une entité dans la liste pour voir ou éditer sa fiche.
              </div>
            )}
          </main>
        </div>
      )}

      {tab === 'relations' && (
        <RelationsPanel campaignId={activeCampaignId} readOnly={!isMj} />
      )}

      {tab === 'events' && (
        <EventsPanel campaignId={activeCampaignId} readOnly={!isMj} />
      )}
    </div>
  );
}

function TypePill({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-[10px] px-2 py-0.5 rounded border font-display uppercase tracking-wider',
        active
          ? 'border-gold bg-gold/10 text-gold'
          : 'border-border/60 text-parchment/70 hover:border-gold/40',
      )}
    >
      <span className="mr-1">{emoji}</span> {label}
    </button>
  );
}
