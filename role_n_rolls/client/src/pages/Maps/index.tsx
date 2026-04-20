import { useState } from 'react';
import { useSession } from '@/stores/session';
import { useAuth } from '@/stores/auth';
import { useCampaign } from '@/hooks/useCampaigns';
import {
  useMaps,
  useCreateMap,
  useDeleteMap,
  useUpdateMap,
  type MapRow,
} from '@/hooks/useMaps';
import { useLoreEntities } from '@/hooks/useLore';
import { NoCampaignHint } from '@/components/shared/NoCampaignHint';
import { MapCanvas } from './MapCanvas';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Plus, Trash2, Loader2, Globe, Lock, Image as ImageIcon, Upload, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MapsPage() {
  const { activeCampaignId } = useSession();
  const campaign = useCampaign(activeCampaignId ?? undefined);
  const userId = useAuth((s) => s.user?.id);
  const isMj = campaign.data?.mj_user_id === userId;

  const maps = useMaps(activeCampaignId ?? undefined);
  const entities = useLoreEntities(activeCampaignId ?? undefined);
  const createM = useCreateMap();
  const updateM = useUpdateMap();
  const deleteM = useDeleteMap();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const uploadM = useImageUpload();

  if (!activeCampaignId) return <NoCampaignHint title="Cartes" />;

  const rows = maps.data ?? [];
  const selected = rows.find((m) => m.id === selectedId) ?? null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;
    try {
      const rec = await createM.mutateAsync({
        campaignId: activeCampaignId,
        title: newTitle.trim(),
        image_url: newUrl.trim(),
      });
      setNewTitle('');
      setNewUrl('');
      setShowForm(false);
      setSelectedId(rec.id);
    } catch (err) {
      alert('Erreur : ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const onFileUpload = async (file: File) => {
    try {
      const { url } = await uploadM.mutateAsync(file);
      setNewUrl(url);
      if (!newTitle.trim()) setNewTitle(file.name.replace(/\.[a-z0-9]+$/i, ''));
    } catch (err) {
      alert('Upload impossible : ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (sideCollapsed) {
    return (
      <div className="h-full flex overflow-hidden">
        <button
          type="button"
          onClick={() => setSideCollapsed(false)}
          className="m-2 h-fit panel p-2 text-gold/70 hover:text-gold sticky top-2 z-10"
          title="Afficher la liste des cartes"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <main className="flex-1 overflow-hidden relative">
          {renderMain()}
        </main>
      </div>
    );
  }

  function renderMain() {
    if (!selected) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground italic">
          Sélectionne ou crée une carte.
        </div>
      );
    }
    return (
      <MapView
        map={selected}
        readOnly={!isMj}
        entities={entities.data ?? []}
        onTogglePublic={() =>
          updateM.mutate({ id: selected.id, campaignId: selected.campaign_id, patch: { is_public: !selected.is_public } })
        }
        onRename={() => {
          const t = window.prompt('Nouveau titre', selected.title);
          if (t && t.trim()) {
            updateM.mutate({ id: selected.id, campaignId: selected.campaign_id, patch: { title: t.trim() } });
          }
        }}
        onDelete={() => {
          if (window.confirm(`Supprimer "${selected.title}" ?`)) {
            deleteM.mutate(
              { id: selected.id, campaignId: selected.campaign_id },
              { onSuccess: () => setSelectedId(null) },
            );
          }
        }}
      />
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      <aside className="w-[260px] shrink-0 border-r border-border/60 flex flex-col">
        <header className="p-3 border-b border-border/60 flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="heading-rune text-lg">🗺️ Cartes</h1>
            <div className="text-xs text-muted-foreground truncate">{campaign.data?.title}</div>
          </div>
          <button
            type="button"
            onClick={() => setSideCollapsed(true)}
            className="text-muted-foreground hover:text-gold"
            title="Masquer la liste"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          {maps.isLoading ? (
            <div className="p-6 text-center"><Loader2 className="w-4 h-4 animate-spin text-gold mx-auto" /></div>
          ) : rows.length === 0 ? (
            <p className="p-4 text-xs italic text-muted-foreground text-center">Aucune carte.</p>
          ) : (
            <ul>
              {rows.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 flex items-center gap-2 text-sm border-l-2 hover:bg-gold/5',
                      selectedId === m.id ? 'border-gold bg-gold/10 text-gold' : 'border-transparent',
                    )}
                  >
                    <ImageIcon className="w-3 h-3 shrink-0" />
                    <span className="flex-1 truncate">{m.title}</span>
                    {m.is_public ? (
                      <Globe className="w-3 h-3 text-emerald-400/70" />
                    ) : (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {isMj && (
          <div className="p-3 border-t border-border/60 space-y-2">
            {showForm ? (
              <form onSubmit={submit} className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="Titre"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-input border border-border/60 rounded px-2 py-1 text-xs focus:outline-none focus:border-gold"
                />
                <div className="flex gap-1">
                  <label
                    className={
                      'btn-rune text-[10px] cursor-pointer ' +
                      (uploadM.isPending ? 'opacity-60 cursor-wait' : '')
                    }
                    title="Charger depuis ton ordinateur"
                  >
                    {uploadM.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    Importer
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadM.isPending}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void onFileUpload(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <input
                    type="url"
                    placeholder="…ou URL"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="flex-1 bg-input border border-border/60 rounded px-2 py-1 text-xs focus:outline-none focus:border-gold"
                  />
                </div>
                {newUrl && (
                  <img
                    src={newUrl}
                    alt=""
                    className="w-full h-24 object-cover rounded border border-border/60"
                  />
                )}
                <div className="flex gap-1">
                  <button
                    type="submit"
                    disabled={createM.isPending || !newTitle.trim() || !newUrl.trim()}
                    className="btn-rune text-[10px] flex-1"
                  >
                    {createM.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Créer
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-rune text-[10px]">
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" onClick={() => setShowForm(true)} className="btn-rune w-full text-xs">
                <Plus className="w-3 h-3" /> Ajouter une carte
              </button>
            )}
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-hidden relative">{renderMain()}</main>
    </div>
  );
}

function MapView({
  map,
  readOnly,
  entities,
  onTogglePublic,
  onRename,
  onDelete,
}: {
  map: MapRow;
  readOnly: boolean;
  entities: Array<{ id: string; name: string }>;
  onTogglePublic: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center gap-2 px-4 py-2 border-b border-border/60 flex-wrap">
        <h2 className="heading-rune text-lg flex-1 truncate">{map.title}</h2>
        {!readOnly && (
          <>
            <button type="button" onClick={onRename} className="btn-rune text-xs">Renommer</button>
            <button
              type="button"
              onClick={onTogglePublic}
              className={cn(
                'btn-rune text-xs flex items-center gap-1',
                map.is_public && 'bg-emerald-500/10 border-emerald-400/50 text-emerald-300',
              )}
            >
              {map.is_public ? <><Globe className="w-3 h-3" /> Publique</> : <><Lock className="w-3 h-3" /> Privée</>}
            </button>
            <button type="button" onClick={onDelete} className="btn-blood text-xs">
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </header>
      <div className="flex-1 overflow-auto bg-night-deep/60 p-4">
        <MapCanvas map={map} entities={entities} readOnly={readOnly} />
      </div>
    </div>
  );
}
