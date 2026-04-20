import { useMemo, useState } from 'react';
import {
  useLoreEntities,
  useLoreRelations,
  useCreateLoreRelation,
  useDeleteLoreRelation,
} from '@/hooks/useLore';
import { LORE_TYPE_META } from './meta';
import { Plus, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { EntityIcon } from '@/components/lore/IconPicker';

interface Props {
  campaignId: string;
  readOnly: boolean;
}

export function RelationsPanel({ campaignId, readOnly }: Props) {
  const entities = useLoreEntities(campaignId);
  const relations = useLoreRelations(campaignId);
  const createM = useCreateLoreRelation();
  const deleteM = useDeleteLoreRelation();

  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  const [label, setLabel] = useState('');

  const byId = useMemo(() => new Map(entities.data?.map((e) => [e.id, e]) ?? []), [entities.data]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aId || !bId || aId === bId || !label.trim()) return;
    try {
      await createM.mutateAsync({
        campaignId,
        entity_a_id: aId,
        entity_b_id: bId,
        relation_label: label.trim(),
      });
      setAId('');
      setBId('');
      setLabel('');
    } catch (err) {
      alert('Erreur : ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  if (entities.isLoading) {
    return <div className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin text-gold mx-auto" /></div>;
  }

  const rels = relations.data ?? [];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
      {!readOnly && (
        <form onSubmit={submit} className="panel p-4 space-y-2">
          <div className="heading-rune text-sm">Nouvelle relation</div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
            <EntitySelect value={aId} onChange={setAId} entities={entities.data ?? []} placeholder="Entité A" />
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="est le fils de, ennemi juré de, …"
              className="bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
            />
            <EntitySelect value={bId} onChange={setBId} entities={entities.data ?? []} placeholder="Entité B" />
            <button
              type="submit"
              disabled={!aId || !bId || aId === bId || !label.trim() || createM.isPending}
              className="btn-rune text-xs disabled:opacity-40"
            >
              {createM.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Lier
            </button>
          </div>
        </form>
      )}

      {rels.length === 0 ? (
        <p className="text-center italic text-muted-foreground">Aucune relation définie.</p>
      ) : (
        <ul className="space-y-1">
          {rels.map((r) => {
            const a = byId.get(r.entity_a_id);
            const b = byId.get(r.entity_b_id);
            return (
              <li
                key={r.id}
                className="panel flex items-center gap-2 px-3 py-2 text-sm"
              >
                <span className="font-display font-bold text-gold flex items-center gap-1.5">
                  {a && <EntityIcon type={a.type} iconRef={a.image_url} size={14} />}
                  {a ? a.name : '(supprimé)'}
                </span>
                <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" /> {r.relation_label}
                </span>
                <span className="font-display font-bold text-gold flex-1 truncate flex items-center gap-1.5">
                  {b && <EntityIcon type={b.type} iconRef={b.image_url} size={14} />}
                  {b ? b.name : '(supprimé)'}
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => deleteM.mutate({ id: r.id, campaignId })}
                    className="text-blood hover:text-blood-light"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EntitySelect({
  value,
  onChange,
  entities,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  entities: Array<{ id: string; name: string; type: keyof typeof LORE_TYPE_META }>;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
    >
      <option value="">{placeholder}</option>
      {entities.map((e) => (
        <option key={e.id} value={e.id}>
          {LORE_TYPE_META[e.type].label} · {e.name}
        </option>
      ))}
    </select>
  );
}
