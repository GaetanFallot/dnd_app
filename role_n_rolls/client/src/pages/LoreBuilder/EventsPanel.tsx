import { useState } from 'react';
import {
  useLoreEntities,
  useLoreEvents,
  useCreateLoreEvent,
  useUpdateLoreEvent,
  useDeleteLoreEvent,
  type LoreEventRow,
} from '@/hooks/useLore';
import { LORE_TYPE_META } from './meta';
import { Plus, Trash2, Loader2, Globe, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  campaignId: string;
  readOnly: boolean;
}

export function EventsPanel({ campaignId, readOnly }: Props) {
  const entities = useLoreEntities(campaignId);
  const events = useLoreEvents(campaignId);
  const createM = useCreateLoreEvent();
  const updateM = useUpdateLoreEvent();
  const deleteM = useDeleteLoreEvent();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [linkIds, setLinkIds] = useState<string[]>([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createM.mutateAsync({
        campaignId,
        title: title.trim(),
        description: description.trim() || undefined,
        is_public: isPublic,
        entity_ids: linkIds,
      });
      setTitle('');
      setDescription('');
      setIsPublic(false);
      setLinkIds([]);
    } catch (err) {
      alert('Erreur : ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (events.isLoading || entities.isLoading) {
    return <div className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin text-gold mx-auto" /></div>;
  }

  const rows = events.data ?? [];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
      {!readOnly && (
        <form onSubmit={submit} className="panel p-4 space-y-2">
          <div className="heading-rune text-sm">Ajouter un événement</div>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre"
            className="w-full bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optionnelle)"
            rows={3}
            className="w-full bg-input border border-border/60 rounded px-2 py-1 text-sm resize-y focus:outline-none focus:border-gold"
          />
          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Entités liées</span>
              <select
                multiple
                value={linkIds}
                onChange={(e) => {
                  const picked = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setLinkIds(picked);
                }}
                className="bg-input border border-border/60 rounded px-2 py-1 focus:outline-none focus:border-gold h-24"
              >
                {entities.data?.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {LORE_TYPE_META[ent.type].emoji} {ent.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="accent-gold"
              />
              Visible dans le lore public
            </label>
          </div>
          <button
            type="submit"
            disabled={createM.isPending || !title.trim()}
            className="btn-rune text-xs disabled:opacity-40"
          >
            {createM.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Ajouter
          </button>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="text-center italic text-muted-foreground">Aucun événement enregistré.</p>
      ) : (
        <ol className="relative border-l-2 border-gold/30 ml-3 space-y-4">
          {rows.map((ev) => (
            <EventItem
              key={ev.id}
              ev={ev}
              readOnly={readOnly}
              entityName={(id) => {
                const ent = entities.data?.find((e) => e.id === id);
                return ent ? `${LORE_TYPE_META[ent.type].emoji} ${ent.name}` : '(supprimé)';
              }}
              onToggleVisibility={() =>
                updateM.mutate({ id: ev.id, campaignId, patch: { is_public: !ev.is_public } })
              }
              onDelete={() => {
                if (window.confirm(`Supprimer "${ev.title}" ?`)) {
                  deleteM.mutate({ id: ev.id, campaignId });
                }
              }}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function EventItem({
  ev,
  readOnly,
  entityName,
  onToggleVisibility,
  onDelete,
}: {
  ev: LoreEventRow;
  readOnly: boolean;
  entityName: (id: string) => string;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="ml-4">
      <span className="absolute -left-[7px] w-3 h-3 rounded-full bg-gold border-2 border-night-deep" />
      <div className="panel p-3 space-y-1.5">
        <div className="flex items-start gap-2">
          <h3 className="font-display text-gold flex-1">{ev.title}</h3>
          <time className="text-[10px] text-muted-foreground shrink-0">
            {new Date(ev.created_at).toLocaleDateString()}
          </time>
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={onToggleVisibility}
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded border font-display uppercase tracking-wider flex items-center gap-1',
                  ev.is_public
                    ? 'border-emerald-400/50 text-emerald-300'
                    : 'border-border/60 text-muted-foreground hover:text-parchment',
                )}
              >
                {ev.is_public ? <><Globe className="w-3 h-3" /> Public</> : <><Lock className="w-3 h-3" /> Privé</>}
              </button>
              <button type="button" onClick={onDelete} className="text-blood hover:text-blood-light">
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
        {ev.description && (
          <p className="text-sm whitespace-pre-line text-parchment/80">{ev.description}</p>
        )}
        {ev.linked_entity_ids.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {ev.linked_entity_ids.map((eid) => (
              <span key={eid} className="text-[10px] px-1.5 py-0.5 rounded border border-gold/30 text-gold/80">
                {entityName(eid)}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
