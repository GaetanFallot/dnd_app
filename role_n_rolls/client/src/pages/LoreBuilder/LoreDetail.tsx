import type { LoreEntityRow, LoreRelationRow, LoreStatRow } from '@/hooks/useLore';
import { useLoreEvents } from '@/hooks/useLore';
import { LORE_TYPE_META } from './meta';
import { Edit3, Link2, EyeOff, StickyNote } from 'lucide-react';
import { EntityIcon, parseIconRef } from '@/components/lore/IconPicker';
import { useLoreOverrides, useUpsertLoreOverride } from '@/hooks/useLoreOverrides';
import { useMemo, useState } from 'react';

/**
 * Design-matched detail panel: hero (type badge + name + subtitle + gradient),
 * sections (Caractéristiques / Description with dropcap / Relations / timeline
 * via events — omitted here since events live on a separate tab).
 */

const HERO_GRADIENTS: Record<string, string> = {
  city:     'linear-gradient(135deg,#2a1f12 0%,#5a442c 45%,#c49450 100%)',
  family:   'linear-gradient(135deg,#1a1820 0%,#3c3849 50%,#a89bc8 100%)',
  npc:      'linear-gradient(135deg,#211814 0%,#3a2a20 50%,#8a5a3a 100%)',
  guild:    'linear-gradient(135deg,#14100a 0%,#2a241c 60%,#4a3a28 100%)',
  creature: 'linear-gradient(135deg,#1a0a08 0%,#4a1e12 45%,#c04530 100%)',
  faction:  'linear-gradient(135deg,#1e2a14 0%,#3c4a24 50%,#a4bf5f 100%)',
  place:    'linear-gradient(135deg,#1a2228 0%,#3a4a55 50%,#7a8a95 100%)',
  object:   'linear-gradient(135deg,#1a1a1e 0%,#4a4a58 50%,#e9e4d0 100%)',
  deity:    'radial-gradient(circle at 50% 40%,#fff4d0 0%,#e9c583 25%,#7D654C 60%,#1a140a 100%)',
  other:    'linear-gradient(135deg,#141414 0%,#2a2a2a 50%,#5a5a5a 100%)',
};

interface Props {
  entity: LoreEntityRow;
  entities: LoreEntityRow[];
  relations: LoreRelationRow[];
  activeCampaignId: string | null;
  onSelect: (id: string) => void;
  onEdit?: () => void;
  onAddLink?: () => void;
}

export function LoreDetail({ entity, entities, relations, activeCampaignId, onSelect, onEdit, onAddLink }: Props) {
  const isLinked = !!activeCampaignId && entity.campaign_id !== activeCampaignId;
  const overrides = useLoreOverrides(activeCampaignId ?? undefined);
  const upsertOverride = useUpsertLoreOverride();
  const override = activeCampaignId ? overrides.data?.[entity.id] : undefined;
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const events = useLoreEvents(activeCampaignId ?? undefined);
  const timeline = useMemo(
    () =>
      (events.data ?? [])
        .filter((ev) => ev.linked_entity_ids.includes(entity.id))
        .slice(0, 10),
    [events.data, entity.id],
  );
  const custom = (entity.custom_data ?? {}) as {
    meta?: Array<{ k: string; v: string }>;
    stats?: LoreStatRow[];
    tags?: string[];
  };
  const typeMeta = LORE_TYPE_META[entity.type];
  const entById = new Map(entities.map((e) => [e.id, e]));

  const myRelations = relations
    .filter((r) => r.entity_a_id === entity.id || r.entity_b_id === entity.id)
    .map((r) => {
      const otherId = r.entity_a_id === entity.id ? r.entity_b_id : r.entity_a_id;
      return { other: entById.get(otherId), label: r.relation_label };
    })
    .filter((r): r is { other: LoreEntityRow; label: string } => !!r.other);

  const parsed = parseIconRef(entity.image_url);
  const heroBg =
    parsed.kind === 'image'
      ? `url(${parsed.url})`
      : HERO_GRADIENTS[entity.type] ?? HERO_GRADIENTS.other;

  return (
    <aside
      className="lore-theme flex flex-col min-h-0 overflow-y-auto"
      style={{
        background: 'linear-gradient(180deg,#121214,#0e0e10)',
        width: 460,
        flexShrink: 0,
      }}
    >
      {/* Hero */}
      <div
        className="relative flex-shrink-0"
        style={{ height: 240, minHeight: 240, borderBottom: '1px solid var(--line)' }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ background: heroBg, filter: 'saturate(0.85) contrast(1.05)' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg,rgba(13,13,15,0) 20%,rgba(13,13,15,0.95) 100%)',
          }}
        />
        <div className="absolute top-[18px] left-[18px] flex gap-1.5">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-[0.12em] backdrop-blur"
            style={{
              background: 'rgba(13,13,15,0.7)',
              border: '1px solid var(--line)',
              color: 'var(--lgold-2)',
            }}
          >
            <EntityIcon type={entity.type} iconRef={parsed.kind === 'lucide' ? entity.image_url : null} size={12} />
            {typeMeta.label}
          </span>
          {entity.is_public && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-[0.12em] backdrop-blur"
              style={{
                background: 'rgba(13,13,15,0.7)',
                border: '1px solid rgba(116,139,61,0.4)',
                color: '#a4bf5f',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#a4bf5f' }} />
              Public
            </span>
          )}
          {isLinked && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-[0.12em] backdrop-blur"
              style={{
                background: 'rgba(13,13,15,0.7)',
                border: '1px solid rgba(138,111,179,0.45)',
                color: '#b099d0',
              }}
              title="Entité importée d'une autre campagne — lecture seule ici"
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#b099d0' }} />
              Lié
            </span>
          )}
        </div>
        <div
          className="absolute left-6 right-6 bottom-[18px] cinzel font-bold leading-tight"
          style={{
            fontSize: 28,
            color: 'var(--lgold-2)',
            letterSpacing: '0.06em',
            textShadow: '0 2px 20px rgba(0,0,0,0.8)',
          }}
        >
          {entity.name}
        </div>
        <div
          className="absolute left-6 right-6 -bottom-0.5 uppercase"
          style={{
            fontSize: 11,
            color: 'var(--text-mute)',
            letterSpacing: '0.22em',
          }}
        >
          {typeMeta.label}
        </div>
      </div>

      {/* Sections */}
      <div className="p-6 flex flex-col gap-[18px]">
        {custom.meta && custom.meta.length > 0 && (
          <Section label="Caractéristiques" icon="⌘">
            <div className="grid grid-cols-2 gap-3">
              {custom.meta.map((m, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div
                    className="text-[10px] font-black uppercase tracking-[0.18em]"
                    style={{ color: 'rgba(239,233,220,0.5)' }}
                  >
                    {m.k}
                  </div>
                  <div
                    className={i === 0 ? 'cinzel' : ''}
                    style={{
                      color: i === 0 ? 'var(--lgold-2)' : 'var(--text)',
                      fontSize: 14,
                      letterSpacing: i === 0 ? '0.04em' : undefined,
                      fontWeight: 500,
                    }}
                  >
                    {m.v}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {entity.description && (
          <Section label="Description" icon="📖">
            <div
              className="prose-drop text-[13.5px] leading-[1.7] whitespace-pre-line"
              style={{ color: 'var(--text-dim)' }}
            >
              {entity.description}
            </div>
            {custom.tags && custom.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {custom.tags.map((t, i) => (
                  <span
                    key={i}
                    className="text-[10.5px] px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: 'rgba(212,168,87,0.08)',
                      border: '1px solid rgba(212,168,87,0.22)',
                      color: 'var(--lgold-2)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </Section>
        )}

        {custom.stats && custom.stats.length > 0 && (
          <Section label="Indicateurs" icon="▤">
            <div className="flex flex-col gap-2.5">
              {custom.stats.map((s, i) => (
                <StatBar key={i} stat={s} />
              ))}
            </div>
          </Section>
        )}

        <Section label={`Relations · ${myRelations.length}`} icon="✦">
          {myRelations.length === 0 ? (
            <p className="italic text-[12.5px]" style={{ color: 'var(--text-mute)' }}>
              Aucune relation définie pour cette entité.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {myRelations.map((r, i) => {
                const otherMeta = LORE_TYPE_META[r.other.type];
                const otherParsed = parseIconRef(r.other.image_url);
                return (
                  <button
                    key={`${r.other.id}-${i}`}
                    type="button"
                    onClick={() => onSelect(r.other.id)}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-[18px] transition-all hover:-translate-y-0.5 text-left"
                    style={{
                      background: 'var(--panel)',
                      border: '1px solid var(--line-soft)',
                    }}
                  >
                    <div
                      className="w-[34px] h-[34px] rounded-xl grid place-items-center shrink-0 overflow-hidden"
                      style={{
                        background: otherParsed.kind === 'image' ? undefined : '#2a2a2e',
                        backgroundImage: otherParsed.kind === 'image' ? `url(${otherParsed.url})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        border: '1px solid var(--line)',
                        color: 'var(--lgold-2)',
                      }}
                    >
                      {otherParsed.kind !== 'image' && (
                        <EntityIcon type={r.other.type} iconRef={r.other.image_url} size={18} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="cinzel text-[13px] font-bold truncate"
                        style={{ color: 'var(--text)', letterSpacing: '0.03em' }}
                      >
                        {r.other.name}
                      </div>
                      <div
                        className="text-[10.5px] uppercase tracking-[0.12em] mt-0.5 font-bold"
                        style={{ color: 'var(--text-mute)' }}
                      >
                        {otherMeta.label}
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.1em]"
                      style={relationTagStyle(r.label)}
                    >
                      {r.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        {timeline.length > 0 && (
          <Section label="Chronologie" icon="🜲">
            <ol className="relative pl-4" style={{ borderLeft: '1px solid var(--line)' }}>
              {timeline.map((ev) => (
                <li key={ev.id} className="relative mb-3 pl-2">
                  <span
                    className="absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full"
                    style={{
                      background: 'var(--lgold)',
                      boxShadow: '0 0 0 2px var(--bg)',
                      border: '1px solid var(--lgold-deep)',
                    }}
                  />
                  <div
                    className="cinzel text-[11px] font-bold"
                    style={{ color: 'var(--lgold-2)', letterSpacing: '0.1em' }}
                  >
                    {new Date(ev.created_at).toLocaleDateString()}
                  </div>
                  <div
                    className="text-[12.5px] leading-[1.55] mt-0.5"
                    style={{ color: 'var(--text)' }}
                  >
                    <b style={{ color: 'var(--lgold-2)' }}>{ev.title}</b>
                    {ev.description && (
                      <span className="block mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        {ev.description}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* Per-campaign override controls (linked entities only). */}
        {isLinked && activeCampaignId && (
          <Section label="Override local (cette campagne)" icon="⚙">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() =>
                  upsertOverride.mutate({
                    campaignId: activeCampaignId,
                    entityId: entity.id,
                    patch: { is_hidden: !(override?.is_hidden ?? false) },
                  })
                }
                className="inline-flex items-center gap-2 px-3 py-2 rounded-[14px] text-[12.5px] font-bold tracking-wide self-start"
                style={{
                  background: override?.is_hidden
                    ? 'rgba(235,87,87,0.12)'
                    : 'var(--panel)',
                  border: `1px solid ${override?.is_hidden ? 'rgba(235,87,87,0.45)' : 'var(--line)'}`,
                  color: override?.is_hidden ? '#f08080' : 'var(--text-dim)',
                }}
              >
                <EyeOff className="w-3.5 h-3.5" />
                {override?.is_hidden ? 'Masquée ici' : 'Masquer dans cette campagne'}
              </button>
              <label className="flex flex-col gap-1">
                <span
                  className="text-[10px] font-black uppercase tracking-[0.18em]"
                  style={{ color: 'rgba(239,233,220,0.5)' }}
                >
                  <StickyNote className="inline w-3 h-3 mr-1" />
                  Note privée MJ (cette campagne)
                </span>
                <textarea
                  rows={3}
                  defaultValue={override?.local_note ?? ''}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onBlur={() => {
                    if (noteDraft === null) return;
                    if (noteDraft === (override?.local_note ?? '')) return;
                    upsertOverride.mutate({
                      campaignId: activeCampaignId,
                      entityId: entity.id,
                      patch: { local_note: noteDraft.trim() || null },
                    });
                    setNoteDraft(null);
                  }}
                  className="w-full bg-input border border-border/60 rounded px-2 py-1.5 text-xs resize-y focus:outline-none focus:border-gold"
                  placeholder="Visible uniquement par le MJ de cette campagne"
                />
              </label>
            </div>
          </Section>
        )}

        <div className="flex gap-2.5 mt-1">
          {onAddLink && (
            <button
              type="button"
              onClick={onAddLink}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-[12.5px] font-medium tracking-wide transition-all hover:-translate-y-0.5"
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--line)',
                color: 'var(--text-dim)',
              }}
            >
              <Link2 className="w-3.5 h-3.5" /> Ajouter un lien
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-[12.5px] font-bold tracking-wide transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(180deg,#b8914a,#7D654C)',
                border: '1px solid #8a6d3f',
                color: '#1a140a',
              }}
            >
              <Edit3 className="w-3.5 h-3.5" /> Éditer la fiche
            </button>
          )}
        </div>

        <div className="text-[10px] italic" style={{ color: 'var(--text-mute)' }}>
          Créé le {new Date(entity.created_at).toLocaleDateString()} · MAJ{' '}
          {new Date(entity.updated_at).toLocaleString()}
        </div>
      </div>
    </aside>
  );
}

function StatBar({ stat }: { stat: LoreStatRow }) {
  const pct = Math.max(0, Math.min(100, Math.round(stat.v)));
  const color = stat.c ?? 'gold';
  const fillGradient = {
    gold:   'linear-gradient(90deg,var(--lgold-deep),var(--lgold-2))',
    red:    'linear-gradient(90deg,#7a2b2b,#eb5757)',
    green:  'linear-gradient(90deg,#3d4a20,#748b3d)',
    blue:   'linear-gradient(90deg,#1f3a4a,#5a8fb8)',
    purple: 'linear-gradient(90deg,#3c2d55,#8a6fb3)',
  }[color];
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-[110px] text-[11px] font-bold uppercase tracking-[0.14em] shrink-0"
        style={{ color: 'var(--text-mute)' }}
      >
        {stat.k}
      </div>
      <div
        className="flex-1 h-2 rounded-full relative overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-soft)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: fillGradient }}
        />
      </div>
      <div
        className="mono w-[36px] text-right text-[12px]"
        style={{ color: 'var(--lgold-2)' }}
      >
        {pct}
      </div>
    </div>
  );
}

function Section({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-[24px] p-[22px] shadow-[0_8px_25px_rgba(0,0,0,0.25)]"
      style={{ background: 'rgba(22,22,24,0.7)', border: '1px solid var(--line)' }}
    >
      <div
        className="text-[0.7rem] font-black uppercase tracking-[0.18em] mb-3 flex items-center gap-2"
        style={{ color: 'rgba(239,233,220,0.5)' }}
      >
        {icon && <span style={{ color: 'var(--lgold)' }}>{icon}</span>}
        {label}
      </div>
      {children}
    </section>
  );
}

function relationTagStyle(label: string) {
  const l = label.toLowerCase();
  if (/(alli[ée]|allian|pact)/.test(l)) {
    return {
      background: 'rgba(116,139,61,0.14)',
      color: '#a4bf5f',
      border: '1px solid rgba(116,139,61,0.35)',
    };
  }
  if (/(ennem|conflit|rival|traq|guerre|menace|croisade|pourchass)/.test(l)) {
    return {
      background: 'rgba(235,87,87,0.12)',
      color: '#f08080',
      border: '1px solid rgba(235,87,87,0.3)',
    };
  }
  if (/(vassal|suzerain|hiérarch)/.test(l)) {
    return {
      background: 'rgba(138,111,179,0.14)',
      color: '#b099d0',
      border: '1px solid rgba(138,111,179,0.3)',
    };
  }
  if (/(famille|maison|lign|parent|enfant|fils|hérit)/.test(l)) {
    return {
      background: 'rgba(212,168,87,0.12)',
      color: 'var(--lgold-2)',
      border: '1px solid rgba(212,168,87,0.3)',
    };
  }
  return {
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--text-dim)',
    border: '1px solid var(--line-soft)',
  };
}
