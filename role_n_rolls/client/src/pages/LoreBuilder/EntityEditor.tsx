import { useEffect, useState } from 'react';
import type { LoreEntityRow, LoreCustomData, LoreStatRow, LoreMetaRow } from '@/hooks/useLore';
import type { LoreEntityType } from '@/types/supabase';
import { LORE_TYPE_META, LORE_TYPE_ORDER } from './meta';
import { Globe, Lock, Trash2, ImageIcon, KeyRound, Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EntityIcon, IconPicker, parseIconRef } from '@/components/lore/IconPicker';
import { useCampaignPlayers } from '@/hooks/useCampaigns';
import {
  useEntityAccess,
  useGrantEntityAccess,
  useRevokeEntityAccess,
} from '@/hooks/useLoreAccess';

interface Props {
  entity: LoreEntityRow;
  readOnly: boolean;
  onPatch: (patch: Partial<Pick<LoreEntityRow, 'type' | 'name' | 'description' | 'image_url' | 'is_public' | 'custom_data'>>) => void;
  onDelete: () => void;
}

export function EntityEditor({ entity, readOnly, onPatch, onDelete }: Props) {
  const [local, setLocal] = useState(entity);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => setLocal(entity), [entity]);

  // Compare against the *persisted* entity (prop), not the local draft —
  // the caller already passes `local[key]` from the onBlur, so comparing
  // with local always short-circuits and nothing saves.
  const commit = <K extends keyof LoreEntityRow>(key: K, value: LoreEntityRow[K]) => {
    if (entity[key] === value) return;
    setLocal((l) => ({ ...l, [key]: value }));
    onPatch({ [key]: value } as Partial<LoreEntityRow>);
  };

  const parsed = parseIconRef(local.image_url);
  const isImage = parsed.kind === 'image';

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <header className="flex items-start gap-3">
        <button
          type="button"
          disabled={readOnly}
          onClick={() => setIconPickerOpen(true)}
          className={cn(
            'w-20 h-20 rounded-lg border-2 border-gold/40 bg-night-deep shrink-0 flex items-center justify-center overflow-hidden',
            !readOnly && 'cursor-pointer hover:border-gold',
          )}
          style={isImage ? { backgroundImage: `url(${(parsed as { url: string }).url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          title={readOnly ? undefined : 'Changer l\'icône ou l\'image'}
        >
          {!isImage && <EntityIcon type={local.type} iconRef={local.image_url} size={36} className="text-gold" />}
        </button>
        <div className="flex-1 space-y-2">
          <input
            type="text"
            disabled={readOnly}
            value={local.name}
            onChange={(e) => setLocal((l) => ({ ...l, name: e.target.value }))}
            onBlur={() => commit('name', local.name)}
            className="w-full bg-transparent font-display font-bold text-gold text-2xl border-b border-transparent focus:border-gold/60 focus:outline-none"
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
                    {LORE_TYPE_META[t].label}
                  </option>
                ))}
              </select>
            </label>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setIconPickerOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded border border-border/60 text-[10px] font-display font-bold uppercase tracking-wider text-parchment/70 hover:text-gold hover:border-gold/50"
                title="Choisir une icône"
              >
                <ImageIcon className="w-3 h-3" /> Icône
              </button>
            )}
            <button
              type="button"
              disabled={readOnly}
              onClick={() => commit('is_public', !local.is_public)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-display font-bold uppercase tracking-wider',
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

      <IconPicker
        open={iconPickerOpen}
        type={local.type}
        value={local.image_url}
        onChange={(ref) => commit('image_url', ref)}
        onClose={() => setIconPickerOpen(false)}
      />

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

      {!readOnly && (
        <CustomDataEditor
          value={(local.custom_data as LoreCustomData | null) ?? {}}
          onChange={(next) => {
            setLocal((l) => ({ ...l, custom_data: next }));
            onPatch({ custom_data: next });
          }}
        />
      )}

      {!readOnly && !local.is_public && <PlayerAccessPanel entity={local} />}

      <div className="text-[10px] text-muted-foreground italic">
        Créé le {new Date(entity.created_at).toLocaleDateString()} · MAJ {new Date(entity.updated_at).toLocaleString()}
      </div>
    </div>
  );
}

const STAT_COLORS: Array<{ id: LoreStatRow['c']; label: string }> = [
  { id: 'gold',   label: 'Or' },
  { id: 'red',    label: 'Rouge' },
  { id: 'green',  label: 'Vert' },
  { id: 'blue',   label: 'Bleu' },
  { id: 'purple', label: 'Violet' },
];

function CustomDataEditor({
  value,
  onChange,
}: {
  value: LoreCustomData;
  onChange: (next: LoreCustomData) => void;
}) {
  const meta: LoreMetaRow[] = value.meta ?? [];
  const stats: LoreStatRow[] = value.stats ?? [];
  const tags: string[] = value.tags ?? [];

  const setMeta = (next: LoreMetaRow[]) => onChange({ ...value, meta: next });
  const setStats = (next: LoreStatRow[]) => onChange({ ...value, stats: next });
  const setTags = (next: string[]) => onChange({ ...value, tags: next });

  return (
    <section className="panel p-3 space-y-4">
      <h3 className="font-display font-bold text-gold text-sm uppercase tracking-wider">
        Bulles de données
      </h3>

      {/* Caractéristiques */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Caractéristiques (clé → valeur)
          </span>
          <button
            type="button"
            onClick={() => setMeta([...meta, { k: '', v: '' }])}
            className="ml-auto btn-rune text-[10px] px-2 py-0.5"
          >
            <Plus className="w-3 h-3" /> Ligne
          </button>
        </div>
        {meta.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">
            Aucune caractéristique. Utile pour : Région, Population, Chef, Âge…
          </p>
        ) : (
          <ul className="space-y-1.5">
            {meta.map((m, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={m.k}
                  placeholder="Clé"
                  onChange={(e) => {
                    const next = [...meta];
                    next[i] = { ...next[i], k: e.target.value };
                    setMeta(next);
                  }}
                  className="w-32 bg-input border border-border/60 rounded px-2 py-1 text-xs focus:outline-none focus:border-gold"
                />
                <input
                  type="text"
                  value={m.v}
                  placeholder="Valeur"
                  onChange={(e) => {
                    const next = [...meta];
                    next[i] = { ...next[i], v: e.target.value };
                    setMeta(next);
                  }}
                  className="flex-1 bg-input border border-border/60 rounded px-2 py-1 text-xs focus:outline-none focus:border-gold"
                />
                <button
                  type="button"
                  onClick={() => setMeta(meta.filter((_, j) => j !== i))}
                  className="text-blood hover:text-blood-light"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Indicateurs */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Indicateurs (barres 0–100)
          </span>
          <button
            type="button"
            onClick={() => setStats([...stats, { k: '', v: 50, c: 'gold' }])}
            className="ml-auto btn-rune text-[10px] px-2 py-0.5"
          >
            <Plus className="w-3 h-3" /> Barre
          </button>
        </div>
        {stats.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">
            Aucun indicateur. Ex : Prospérité 82, Corruption 34.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {stats.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={s.k}
                  placeholder="Label"
                  onChange={(e) => {
                    const next = [...stats];
                    next[i] = { ...next[i], k: e.target.value };
                    setStats(next);
                  }}
                  className="flex-1 bg-input border border-border/60 rounded px-2 py-1 text-xs focus:outline-none focus:border-gold"
                />
                <input
                  type="number"
                  value={s.v}
                  min={0}
                  max={100}
                  onChange={(e) => {
                    const next = [...stats];
                    next[i] = { ...next[i], v: Number(e.target.value) };
                    setStats(next);
                  }}
                  className="w-16 bg-input border border-border/60 rounded px-2 py-1 text-xs focus:outline-none focus:border-gold text-right"
                />
                <select
                  value={s.c ?? 'gold'}
                  onChange={(e) => {
                    const next = [...stats];
                    next[i] = { ...next[i], c: e.target.value as LoreStatRow['c'] };
                    setStats(next);
                  }}
                  className="bg-input border border-border/60 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-gold"
                >
                  {STAT_COLORS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setStats(stats.filter((_, j) => j !== i))}
                  className="text-blood hover:text-blood-light"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          Tags
        </span>
        <div className="flex flex-wrap gap-1.5 items-center">
          {tags.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-gold bg-gold/10 border border-gold/30"
            >
              {t}
              <button
                type="button"
                onClick={() => setTags(tags.filter((_, j) => j !== i))}
                className="hover:text-blood"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            placeholder="+ tag (entrée)"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              const v = (e.target as HTMLInputElement).value.trim();
              if (!v) return;
              setTags([...tags, v]);
              (e.target as HTMLInputElement).value = '';
              e.preventDefault();
            }}
            className="bg-input border border-border/60 rounded px-2 py-1 text-xs w-40 focus:outline-none focus:border-gold"
          />
        </div>
      </div>
    </section>
  );
}

function PlayerAccessPanel({ entity }: { entity: LoreEntityRow }) {
  const players = useCampaignPlayers(entity.campaign_id);
  const access = useEntityAccess(entity.campaign_id, entity.id);
  const grant = useGrantEntityAccess();
  const revoke = useRevokeEntityAccess();

  const grantedUserIds = new Set((access.data ?? []).map((a) => a.user_id));
  const rows = players.data ?? [];

  return (
    <section className="panel p-3 space-y-2">
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-gold" />
        <h3 className="font-display font-bold text-gold text-sm uppercase tracking-wider">
          Accès joueurs
        </h3>
        <span className="ml-auto text-[10px] italic text-muted-foreground">
          Privé — {grantedUserIds.size} joueur·euse(s) ont accès
        </span>
      </div>
      {players.isLoading ? (
        <p className="italic text-xs text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="italic text-xs text-muted-foreground">
          Aucun joueur inscrit à cette campagne. Invite-les depuis le partage avant de partager des entités privées.
        </p>
      ) : (
        <ul className="space-y-1">
          {rows.filter((p) => p.role !== 'mj').map((p) => {
            const granted = grantedUserIds.has(p.user_id);
            return (
              <li
                key={p.user_id}
                className="flex items-center gap-2 bg-night-deep/40 rounded px-2 py-1.5 text-sm"
              >
                <span className="font-display text-parchment flex-1 truncate">
                  {p.display_name ?? p.email ?? p.user_id}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const args = { campaignId: entity.campaign_id, entityId: entity.id, userId: p.user_id };
                    if (granted) revoke.mutate(args);
                    else grant.mutate(args);
                  }}
                  className={cn(
                    'text-[10px] px-2 py-1 rounded border flex items-center gap-1 font-display font-bold uppercase tracking-wider',
                    granted
                      ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300'
                      : 'border-border/60 text-muted-foreground hover:text-parchment hover:border-gold/60',
                  )}
                >
                  {granted ? <><Check className="w-3 h-3" /> Accès</> : 'Donner accès'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[10px] italic text-muted-foreground">
        Rends l'entité publique pour la partager automatiquement à tous les joueurs de la campagne.
      </p>
    </section>
  );
}
