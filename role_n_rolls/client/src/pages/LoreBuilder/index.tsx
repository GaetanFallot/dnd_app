import { useMemo, useState } from 'react';
import { useSession } from '@/stores/session';
import { useAuth } from '@/stores/auth';
import { useCampaign } from '@/hooks/useCampaigns';
import {
  useLoreEntities,
  useLoreRelations,
  useCreateLoreEntity,
  useUpdateLoreEntity,
  useDeleteLoreEntity,
} from '@/hooks/useLore';
import { LORE_TYPE_META, LORE_TYPE_ORDER } from './meta';
import { LoreGraph, type LoreLayout } from './LoreGraph';
import { LoreDetail } from './LoreDetail';
import { EntityEditor } from './EntityEditor';
import { RelationsPanel } from './RelationsPanel';
import { EventsPanel } from './EventsPanel';
import { NoCampaignHint } from '@/components/shared/NoCampaignHint';
import { Plus, Download, Sliders, Link2, Activity, Share2, X, BookMarked } from 'lucide-react';
import type { LoreEntityType } from '@/types/supabase';
import { EntityIcon } from '@/components/lore/IconPicker';

type Tab = 'graph' | 'relations' | 'events';

export function LoreBuilder() {
  const { activeCampaignId } = useSession();
  const campaign = useCampaign(activeCampaignId ?? undefined);
  const userId = useAuth((s) => s.user?.id);
  const isMj = campaign.data?.mj_user_id === userId;

  const entities = useLoreEntities(activeCampaignId ?? undefined);
  const relations = useLoreRelations(activeCampaignId ?? undefined);
  const createM = useCreateLoreEntity();
  const updateM = useUpdateLoreEntity();
  const deleteM = useDeleteLoreEntity();

  const [tab, setTab] = useState<Tab>('graph');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingOpen, setEditingOpen] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [layout, setLayout] = useState<LoreLayout>('radial');

  const rows = useMemo(() => entities.data ?? [], [entities.data]);
  const rels = useMemo(() => relations.data ?? [], [relations.data]);

  // Default selection once data arrives.
  useMemo(() => {
    if (!selectedId && rows.length > 0) setSelectedId(rows[0].id);
    if (selectedId && !rows.find((r) => r.id === selectedId)) {
      setSelectedId(rows[0]?.id ?? null);
    }
  }, [rows, selectedId]);

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
      setEditingOpen(true);
      setShowCreateMenu(false);
    } catch (err) {
      alert('Création impossible : ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (!activeCampaignId) return <NoCampaignHint title="Lore Builder" />;

  return (
    <div
      className="lore-theme h-full flex flex-col overflow-hidden min-h-0"
      style={{ background: 'transparent' }}
    >
      {/* ── Topbar ── */}
      <header
        className="flex items-center gap-4 px-7 py-4"
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'linear-gradient(180deg,rgba(212,168,87,0.03),transparent)',
        }}
      >
        <div>
          <div
            className="uppercase tracking-[0.14em]"
            style={{ fontSize: 11, color: 'var(--text-mute)' }}
          >
            {campaign.data?.title ?? '…'}{' '}
            <span style={{ color: 'var(--lgold-deep)' }}>/</span>{' '}
            <b style={{ color: 'var(--lgold)', fontWeight: 600 }}>Lore Builder</b>
          </div>
          <h1
            className="cinzel mt-1 flex items-center gap-3.5"
            style={{ fontSize: 22, fontWeight: 700, color: 'var(--lgold-2)', letterSpacing: '0.08em' }}
          >
            <span style={{ color: 'var(--lgold-deep)', fontSize: 16, opacity: 0.7 }}>❦</span>
            Atlas des Royaumes
            <span style={{ color: 'var(--lgold-deep)', fontSize: 16, opacity: 0.7 }}>❦</span>
          </h1>
        </div>

        {/* Tabs */}
        <nav className="ml-6 flex gap-1 rounded-xl p-0.5" style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}>
          {(
            [
              ['graph', 'Graphe', BookMarked],
              ['relations', 'Relations', Link2],
              ['events', 'Événements', Activity],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="px-3 py-1.5 rounded-[10px] cinzel text-[11.5px] uppercase tracking-[0.14em] flex items-center gap-1.5 transition-all"
              style={{
                background: tab === id
                  ? 'linear-gradient(180deg,rgba(212,168,87,0.14),rgba(212,168,87,0.04))'
                  : 'transparent',
                color: tab === id ? 'var(--lgold-2)' : 'var(--text-dim)',
                border: tab === id ? '1px solid rgba(212,168,87,0.28)' : '1px solid transparent',
              }}
            >
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setTweaksOpen((o) => !o)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[14px] text-[12.5px] font-medium tracking-wide transition-all hover:-translate-y-0.5"
              style={{
                background: tweaksOpen
                  ? 'linear-gradient(180deg,rgba(212,168,87,0.16),rgba(212,168,87,0.04))'
                  : 'var(--panel)',
                border: `1px solid ${tweaksOpen ? 'rgba(212,168,87,0.5)' : 'var(--line)'}`,
                color: tweaksOpen ? 'var(--lgold-2)' : 'var(--text-dim)',
              }}
            >
              <Sliders className="w-3.5 h-3.5" /> Tweaks
            </button>
            {tweaksOpen && (
              <div
                className="absolute right-0 top-full mt-2 rounded-xl p-3 shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-20 space-y-3"
                style={{
                  background: 'rgba(20,20,22,0.96)',
                  border: '1px solid var(--line)',
                  backdropFilter: 'blur(12px)',
                  minWidth: 260,
                }}
              >
                <div>
                  <div
                    className="text-[10px] font-black uppercase tracking-[0.18em] mb-2"
                    style={{ color: 'rgba(239,233,220,0.5)' }}
                  >
                    Mise en page du graphe
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        ['radial',  'Radial'],
                        ['cluster', 'Cluster'],
                        ['organic', 'Organique'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setLayout(id)}
                        className="px-2 py-2 rounded-lg text-[11px] cinzel font-bold tracking-wider transition-all"
                        style={{
                          background: layout === id
                            ? 'linear-gradient(180deg,rgba(212,168,87,0.2),rgba(212,168,87,0.05))'
                            : 'var(--panel)',
                          border: `1px solid ${layout === id ? 'rgba(212,168,87,0.6)' : 'var(--line)'}`,
                          color: layout === id ? 'var(--lgold-2)' : 'var(--text-dim)',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {layout === 'radial' && !selectedId && (
                    <p className="text-[10px] italic mt-1.5" style={{ color: 'var(--text-mute)' }}>
                      Sélectionne une entité pour la placer au centre.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DesignBtn title="Partage">
            <Share2 className="w-3.5 h-3.5" /> Exporter
          </DesignBtn>
          {isMj && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCreateMenu((s) => !s)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[14px] text-[12.5px] font-bold tracking-wide transition-all hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(180deg,#b8914a,#7D654C)',
                  border: '1px solid #8a6d3f',
                  color: '#1a140a',
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Nouvelle entité
              </button>
              {showCreateMenu && (
                <div
                  className="absolute right-0 top-full mt-2 rounded-xl p-1 shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-20"
                  style={{
                    background: 'rgba(20,20,22,0.96)',
                    border: '1px solid var(--line)',
                    backdropFilter: 'blur(12px)',
                    minWidth: 220,
                  }}
                >
                  {LORE_TYPE_ORDER.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => createNew(t)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] hover:bg-white/5"
                      style={{ color: 'var(--text-dim)' }}
                    >
                      <EntityIcon type={t} iconRef={null} size={16} className="text-gold" />
                      {LORE_TYPE_META[t].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      {tab === 'graph' && (
        <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
          <LoreGraph
            entities={rows}
            relations={rels}
            selectedId={selectedId}
            onSelect={setSelectedId}
            layout={layout}
          />
          {selected ? (
            <LoreDetail
              entity={selected}
              entities={rows}
              relations={rels}
              activeCampaignId={activeCampaignId}
              onSelect={(id) => setSelectedId(id)}
              onEdit={isMj && selected.campaign_id === activeCampaignId ? () => setEditingOpen(true) : undefined}
              onAddLink={isMj ? () => setTab('relations') : undefined}
            />
          ) : (
            <aside
              className="lore-theme flex items-center justify-center text-center p-8"
              style={{
                width: 460,
                flexShrink: 0,
                background: 'linear-gradient(180deg,#121214,#0e0e10)',
                color: 'var(--text-mute)',
              }}
            >
              <div className="max-w-xs">
                <p className="cinzel mb-2" style={{ fontSize: 15, color: 'var(--lgold-2)' }}>
                  Aucune entité sélectionnée
                </p>
                <p className="text-sm italic">
                  Sélectionne un nœud dans le graphe, ou crée une nouvelle entité.
                </p>
              </div>
            </aside>
          )}
        </div>
      )}

      {tab === 'relations' && (
        <div className="lore-theme flex-1 overflow-hidden min-h-0">
          <RelationsPanel campaignId={activeCampaignId} readOnly={!isMj} />
        </div>
      )}

      {tab === 'events' && (
        <div className="lore-theme flex-1 overflow-hidden min-h-0">
          <EventsPanel campaignId={activeCampaignId} readOnly={!isMj} />
        </div>
      )}

      {/* ── Edit drawer ── */}
      {editingOpen && selected && (
        <div
          className="fixed inset-0 z-40 flex"
          onClick={() => setEditingOpen(false)}
        >
          <div className="flex-1 bg-black/60 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="lore-theme w-full max-w-2xl overflow-y-auto"
            style={{
              background: 'linear-gradient(180deg,#121214,#0e0e10)',
              borderLeft: '1px solid var(--line)',
              boxShadow: '-20px 0 40px rgba(0,0,0,0.5)',
            }}
          >
            <header
              className="sticky top-0 flex items-center gap-3 px-6 py-4 z-10"
              style={{
                background: 'rgba(18,18,20,0.95)',
                borderBottom: '1px solid var(--line)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <h2 className="cinzel flex-1" style={{ fontSize: 16, color: 'var(--lgold-2)', letterSpacing: '0.08em' }}>
                Éditer — {selected.name}
              </h2>
              <button
                type="button"
                onClick={() => setEditingOpen(false)}
                style={{ color: 'var(--text-mute)' }}
                className="hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </header>
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
                    {
                      onSuccess: () => {
                        setEditingOpen(false);
                        setSelectedId(null);
                      },
                    },
                  );
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DesignBtn({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-[14px] text-[12.5px] font-medium tracking-wide transition-all hover:-translate-y-0.5"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        color: 'var(--text-dim)',
      }}
    >
      {children}
    </button>
  );
}

// Silence unused import warning in case TS complains about Download in strict mode.
void (Download as unknown);
