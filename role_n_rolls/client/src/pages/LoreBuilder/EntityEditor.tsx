import { useEffect, useState } from 'react';
import type { LoreEntityRow } from '@/hooks/useLore';
import type { LoreEntityType } from '@/types/supabase';
import { LORE_TYPE_META, LORE_TYPE_ORDER } from './meta';
import { Globe, Lock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  entity: LoreEntityRow;
  readOnly: boolean;
  onPatch: (patch: Partial<Pick<LoreEntityRow, 'type' | 'name' | 'description' | 'image_url' | 'is_public'>>) => void;
  onDelete: () => void;
}

export function EntityEditor({ entity, readOnly, onPatch, onDelete }: Props) {
  const [local, setLocal] = useState(entity);

  useEffect(() => setLocal(entity), [entity]);

  const commit = <K extends keyof LoreEntityRow>(key: K, value: LoreEntityRow[K]) => {
    if (local[key] === value) return;
    setLocal((l) => ({ ...l, [key]: value }));
    onPatch({ [key]: value } as Partial<LoreEntityRow>);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <header className="flex items-start gap-3">
        <div
          className="w-20 h-20 rounded border-2 border-gold/40 bg-night-deep shrink-0 flex items-center justify-center text-4xl bg-cover bg-center cursor-pointer"
          style={local.image_url ? { backgroundImage: `url(${local.image_url})` } : undefined}
          onClick={() => {
            if (readOnly) return;
            const url = window.prompt("URL d'image (ou vide pour retirer)", local.image_url ?? '');
            if (url !== null) commit('image_url', url || null);
          }}
          title={readOnly ? undefined : 'Cliquer pour changer'}
        >
          {!local.image_url && LORE_TYPE_META[local.type].emoji}
        </div>
        <div className="flex-1 space-y-2">
          <input
            type="text"
            disabled={readOnly}
            value={local.name}
            onChange={(e) => setLocal((l) => ({ ...l, name: e.target.value }))}
            onBlur={() => commit('name', local.name)}
            className="w-full bg-transparent font-display text-gold text-2xl border-b border-transparent focus:border-gold/60 focus:outline-none"
          />
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <label className="flex items-center gap-1">
              <span className="text-muted-foreground">Type</span>
              <select
                disabled={readOnly}
                value={local.type}
                onChange={(e) => commit('type', e.target.value as LoreEntityType)}
                className="bg-input border border-border/60 rounded px-2 py-1 focus:outline-none focus:border-gold"
              >
                {LORE_TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {LORE_TYPE_META[t].emoji} {LORE_TYPE_META[t].label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => commit('is_public', !local.is_public)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-display uppercase tracking-wider',
                local.is_public
                  ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300'
                  : 'border-border/60 text-muted-foreground hover:text-parchment',
                readOnly && 'cursor-default',
              )}
              title={local.is_public ? 'Visible dans le lien public' : 'Privé — non exposé au partage'}
            >
              {local.is_public ? <><Globe className="w-3 h-3" /> Public</> : <><Lock className="w-3 h-3" /> Privé</>}
            </button>
          </div>
        </div>
        {!readOnly && (
          <button type="button" onClick={onDelete} className="btn-blood text-xs px-2 py-1" title="Supprimer">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </header>

      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Description</span>
        <textarea
          disabled={readOnly}
          value={local.description ?? ''}
          onChange={(e) => setLocal((l) => ({ ...l, description: e.target.value }))}
          onBlur={() => commit('description', local.description)}
          rows={12}
          className="w-full mt-1 bg-input border border-border/60 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold resize-y"
        />
      </label>

      <div className="text-[10px] text-muted-foreground italic">
        Créé le {new Date(entity.created_at).toLocaleDateString()} · MAJ {new Date(entity.updated_at).toLocaleString()}
      </div>
    </div>
  );
}
