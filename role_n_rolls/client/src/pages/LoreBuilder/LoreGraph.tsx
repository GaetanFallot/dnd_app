import { useEffect, useMemo, useRef, useState } from 'react';
import type { LoreEntityRow, LoreRelationRow } from '@/hooks/useLore';
import type { LoreEntityType } from '@/types/supabase';
import { LORE_TYPE_META, LORE_TYPE_ORDER } from './meta';
import { Minus, Plus, Search, Maximize2, SlidersHorizontal, ChevronDown, RotateCcw } from 'lucide-react';
import { EntityIcon } from '@/components/lore/IconPicker';

/**
 * SVG lore graph — ports the design's Atlas des Royaumes view:
 * curved edges by relation kind, radial-gradient nodes by type, filter chips,
 * zoom+pan, legend, minimap.
 *
 * Positions are computed in-memory (not persisted) — the aim is a readable
 * layout, not a stable save format.
 */

type Kind = 'family' | 'ally' | 'enemy' | 'vassal' | 'neutral';

const KIND_OF = (label: string): Kind => {
  const l = label.toLowerCase();
  if (/(alli[ée]|allian|pact)/.test(l)) return 'ally';
  if (/(ennem|conflit|pourchass|rival|traq|guerre|menace|croisade)/.test(l)) return 'enemy';
  if (/(vassal|hiérarch|autorit|subordonn|suzerain)/.test(l)) return 'vassal';
  if (/(famille|lign|maison|fils|filiation|parent|sang|fratrie|mère|père|enfant|héri)/.test(l))
    return 'family';
  return 'neutral';
};

const TYPE_GRAD: Record<LoreEntityType, { from: string; to: string }> = {
  city:     { from: '#d4a857', to: '#3c2f20' },
  family:   { from: '#e9c583', to: '#7D654C' },
  npc:      { from: '#e9c583', to: '#5b4025' },
  guild:    { from: '#a4bf5f', to: '#3d4a20' },
  creature: { from: '#f08080', to: '#5a1f1f' },
  faction:  { from: '#a4bf5f', to: '#3d4a20' },
  place:    { from: '#8ec7e0', to: '#1c3a4a' },
  object:   { from: '#b099d0', to: '#3c2d55' },
  deity:    { from: '#fff4d0', to: '#7D654C' },
  other:    { from: '#a89e8a', to: '#3a322a' },
};

export type LoreLayout = 'cluster' | 'organic' | 'radial';

interface Props {
  entities: LoreEntityRow[];
  relations: LoreRelationRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  layout?: LoreLayout;
}

interface PositionedEntity extends LoreEntityRow {
  x: number;
  y: number;
  r: number;
}

const W = 1200;
const H = 800;

const ALL_TYPES: readonly LoreEntityType[] = LORE_TYPE_ORDER;

export function LoreGraph({ entities, relations, selectedId, onSelect, layout = 'cluster' }: Props) {
  const [activeTypes, setActiveTypes] = useState<Set<LoreEntityType>>(
    () => new Set<LoreEntityType>(ALL_TYPES),
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entities.filter((e) => {
      if (!activeTypes.has(e.type)) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entities, activeTypes, search]);

  const toggleType = (t: LoreEntityType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const resetFilters = () => setActiveTypes(new Set(ALL_TYPES));

  // Close dropdown on outside click.
  useEffect(() => {
    if (!filterOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [filterOpen]);

  const positioned = useMemo<PositionedEntity[]>(() => {
    // Deterministic per-id PRNG so organic jitter stays stable between renders.
    const seed = (s: string) => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0) / 0xffffffff;
    };

    if (layout === 'radial') {
      const cx = 600;
      const cy = 400;
      const sel = selectedId ? visible.find((e) => e.id === selectedId) : null;
      if (sel) {
        const others = visible.filter((e) => e.id !== sel.id);
        const ringRadius: Record<LoreEntityType, number> = {
          city: 220, place: 250, family: 280, faction: 280, npc: 310,
          guild: 310, creature: 340, object: 340, deity: 370, other: 370,
        };
        const out: PositionedEntity[] = [{ ...sel, x: cx, y: cy, r: 48 }];
        others.forEach((e, i) => {
          const a = (i / Math.max(1, others.length)) * Math.PI * 2;
          const R = ringRadius[e.type] ?? 300;
          out.push({ ...e, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, r: 40 });
        });
        return out;
      }
      // No selection → behave like cluster.
    }

    const groups: Record<LoreEntityType, { x: number; y: number }> = {
      city:     { x: 300, y: 280 },
      family:   { x: 900, y: 240 },
      npc:      { x: 740, y: 140 },
      guild:    { x: 280, y: 620 },
      creature: { x: 960, y: 620 },
      faction:  { x: 420, y: 620 },
      place:    { x: 180, y: 440 },
      object:   { x: 620, y: 440 },
      deity:    { x: 820, y: 540 },
      other:    { x: 620, y: 700 },
    };
    const counts: Partial<Record<LoreEntityType, number>> = {};
    return visible.map((e) => {
      const g = groups[e.type] ?? groups.other;
      const i = counts[e.type] ?? 0;
      counts[e.type] = i + 1;
      const cols = 3;
      const col = i % cols;
      const row = Math.floor(i / cols);
      let x = g.x + (col - 1) * 130 + (row % 2) * 20;
      let y = g.y + row * 120;
      if (layout === 'organic') {
        // Spread out from the cluster centroid + per-id jitter so the map
        // feels hand-drawn without collapsing into overlaps.
        const jx = (seed(e.id) - 0.5) * 220;
        const jy = (seed(e.id + 'y') - 0.5) * 180;
        x = g.x + jx;
        y = g.y + jy;
      }
      return { ...e, x, y, r: 42 };
    });
  }, [visible, layout, selectedId]);

  const byId = useMemo(() => new Map(positioned.map((e) => [e.id, e])), [positioned]);

  const visibleEdges = useMemo(
    () => relations.filter((r) => byId.has(r.entity_a_id) && byId.has(r.entity_b_id)),
    [relations, byId],
  );

  const relatedIds = useMemo(() => {
    const s = new Set<string>();
    if (!selectedId) return s;
    for (const r of visibleEdges) {
      if (r.entity_a_id === selectedId) s.add(r.entity_b_id);
      if (r.entity_b_id === selectedId) s.add(r.entity_a_id);
    }
    return s;
  }, [visibleEdges, selectedId]);

  const vbW = W / zoom;
  const vbH = H / zoom;
  const vbX = -pan.x + (W - vbW) / 2;
  const vbY = -pan.y + (H - vbH) / 2;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      setZoom((z) => Math.max(0.5, Math.min(2.5, z * f)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-node]')) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    setPan({
      x: drag.current.px + (e.clientX - drag.current.x) / zoom,
      y: drag.current.py + (e.clientY - drag.current.y) / zoom,
    });
  };
  const endDrag = () => (drag.current = null);

  const fit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const counts: Partial<Record<LoreEntityType, number>> = {};
  entities.forEach((e) => {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  });

  const nActive = activeTypes.size;
  const nTotal = ALL_TYPES.length;
  const filterLabel =
    nActive === nTotal ? 'Tous' : nActive === 0 ? 'Aucun' : `${nActive} / ${nTotal}`;

  return (
    <div className="lore-theme flex flex-col min-h-0 min-w-0 border-r" style={{ borderColor: 'var(--line)', flex:'2' }}>
      {/* tools */}
      <div
        className="flex items-center gap-3 px-7 py-3.5 flex-wrap"
        style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}
      >
        <div
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl flex-1 min-w-[240px] max-w-sm"
          style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
        >
          <Search className="w-4 h-4" style={{ color: 'var(--text-mute)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher une cité, famille, créature..."
            className="bg-transparent border-0 outline-0 text-sm flex-1 min-w-0"
            style={{ color: 'var(--text)' }}
          />
        </div>

        <div ref={filterRef} className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFilterOpen((o) => !o);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[20px] text-xs tracking-wide transition-all"
            style={{
              background: 'var(--panel)',
              border: `1px solid ${filterOpen ? 'var(--lgold-deep)' : 'var(--line)'}`,
              color: filterOpen ? 'var(--lgold-2)' : 'var(--text-dim)',
              letterSpacing: '0.06em',
            }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtres</span>
            <span
              className="cinzel px-2 py-0.5 rounded-[10px]"
              style={{
                color: 'var(--lgold-2)',
                background: 'rgba(212,168,87,0.12)',
                fontSize: '11.5px',
                letterSpacing: '0.08em',
              }}
            >
              {filterLabel}
            </span>
            <ChevronDown
              className="w-3 h-3 transition-transform"
              style={{ transform: filterOpen ? 'rotate(180deg)' : 'none' }}
            />
          </button>

          {filterOpen && (
            <div
              className="absolute left-0 top-[calc(100%+6px)] z-20 rounded-[14px] p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
              style={{
                background: 'rgba(20,20,22,0.98)',
                border: '1px solid var(--lgold-deep)',
                backdropFilter: 'blur(10px)',
                minWidth: 240,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center justify-between px-1.5 pb-2.5 mb-1.5 font-bold uppercase"
                style={{
                  borderBottom: '1px solid var(--line-soft)',
                  fontSize: 10,
                  color: 'var(--text-mute)',
                  letterSpacing: '0.16em',
                }}
              >
                <span>Types d'entités</span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors"
                  style={{
                    color: 'var(--lgold-2)',
                    fontSize: '10.5px',
                    letterSpacing: '0.08em',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212,168,87,0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <RotateCcw className="w-3 h-3" /> Réinitialiser
                </button>
              </div>
              {ALL_TYPES.map((t) => {
                const checked = activeTypes.has(t);
                const n = counts[t] ?? 0;
                return (
                  <label
                    key={t}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] cursor-pointer transition-colors"
                    style={{
                      fontSize: '12.5px',
                      color: checked ? 'var(--text)' : 'var(--text-dim)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212,168,87,0.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleType(t)}
                      style={{ accentColor: 'var(--lgold)', width: 14, height: 14 }}
                    />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: TYPE_GRAD[t].from }}
                    />
                    <span className="flex-1 flex items-center gap-2">
                      <EntityIcon type={t} iconRef={null} size={14} />
                      {LORE_TYPE_META[t].label}
                    </span>
                    <span style={{ color: 'var(--text-mute)', fontSize: 11 }}>{n}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div
          className="ml-auto flex items-center gap-1 rounded-2xl p-1"
          style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
        >
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z / 1.2))}
            className="w-7 h-7 rounded-xl grid place-items-center hover:bg-white/5"
            style={{ color: 'var(--text-dim)' }}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <div className="mono text-[11px] min-w-[44px] text-center" style={{ color: 'var(--text-mute)' }}>
            {Math.round(zoom * 100)}%
          </div>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
            className="w-7 h-7 rounded-xl grid place-items-center hover:bg-white/5"
            style={{ color: 'var(--text-dim)' }}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={fit}
            className="w-7 h-7 rounded-xl grid place-items-center hover:bg-white/5"
            style={{ color: 'var(--text-dim)' }}
            title="Centrer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* canvas */}
      <div
        ref={wrapRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(212,168,87,0.05), transparent 60%), #0a0a0c',
          cursor: drag.current ? 'grabbing' : 'grab',
        }}
      >
        <svg
          viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full block"
        >
          <defs>
            <pattern id="lore-dots" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="0.9" fill="rgba(212,168,87,0.09)" />
            </pattern>
            {(Object.keys(TYPE_GRAD) as LoreEntityType[]).map((t) => (
              <radialGradient id={`lore-grad-${t}`} key={t} cx="30%" cy="30%">
                <stop offset="0%" stopColor={TYPE_GRAD[t].from} />
                <stop offset="100%" stopColor={TYPE_GRAD[t].to} />
              </radialGradient>
            ))}
          </defs>
          <rect x={0} y={0} width={W} height={H} fill="url(#lore-dots)" />

          <g>
            {visibleEdges.map((edge) => {
              const a = byId.get(edge.entity_a_id)!;
              const b = byId.get(edge.entity_b_id)!;
              const kind = KIND_OF(edge.relation_label);
              const isHi = edge.entity_a_id === selectedId || edge.entity_b_id === selectedId;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const cx = mx - dy * 0.12;
              const cy = my + dx * 0.12;
              const stroke =
                kind === 'ally'
                  ? 'rgba(116,139,61,0.45)'
                  : kind === 'enemy'
                  ? 'rgba(235,87,87,0.45)'
                  : kind === 'family'
                  ? 'rgba(212,168,87,0.55)'
                  : kind === 'vassal'
                  ? 'rgba(138,111,179,0.5)'
                  : 'rgba(212,168,87,0.22)';
              const dash = kind === 'enemy' ? '5 4' : kind === 'vassal' ? '2 3' : undefined;
              return (
                <g key={edge.id}>
                  <path
                    d={`M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={isHi ? 2.4 : 1.4}
                    strokeDasharray={dash}
                    filter={isHi ? 'drop-shadow(0 0 6px rgba(212,168,87,0.45))' : undefined}
                  />
                  {/* Background rect for readability, then the label. */}
                  <g style={{ pointerEvents: 'none' }}>
                    <rect
                      x={cx - edge.relation_label.length * 3.1 - 4}
                      y={cy - 8}
                      width={edge.relation_label.length * 6.2 + 8}
                      height={13}
                      rx={6}
                      fill="rgba(13,13,15,0.75)"
                      stroke={isHi ? 'rgba(212,168,87,0.35)' : 'rgba(212,168,87,0.12)'}
                      strokeWidth={0.75}
                      opacity={isHi ? 1 : 0.78}
                    />
                    <text
                      x={cx}
                      y={cy + 2}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight={600}
                      fill={isHi ? 'var(--lgold-2)' : 'var(--text-dim)'}
                      style={{
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        fontFamily: 'Inter,sans-serif',
                      }}
                    >
                      {edge.relation_label}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          <g>
            {positioned.map((e) => {
              const isSel = e.id === selectedId;
              const isRel = relatedIds.has(e.id);
              const op = selectedId && !isSel && !isRel ? 0.45 : 1;
              const r = e.r;
              return (
                <g
                  key={e.id}
                  data-node
                  transform={`translate(${e.x},${e.y})`}
                  opacity={op}
                  onClick={() => onSelect(e.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={r + 10}
                    fill="rgba(212,168,87,0.04)"
                    stroke="rgba(212,168,87,0.12)"
                    strokeWidth={1}
                  />
                  <circle
                    r={r}
                    fill={`url(#lore-grad-${e.type})`}
                    stroke={isSel ? 'var(--lgold-2)' : 'rgba(0,0,0,0.4)'}
                    strokeWidth={isSel ? 2.5 : 1}
                  />
                  <circle r={r - 6} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={1} />
                  <foreignObject
                    x={-r * 0.55}
                    y={-r * 0.55}
                    width={r * 1.1}
                    height={r * 1.1}
                    style={{ pointerEvents: 'none' }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(13,13,15,0.85)',
                      }}
                    >
                      <EntityIcon type={e.type} iconRef={e.image_url} size={r * 0.75} />
                    </div>
                  </foreignObject>
                  <text
                    y={r + 22}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill="var(--lgold-2)"
                    style={{
                      fontFamily: 'Cinzel,serif',
                      letterSpacing: '0.06em',
                      pointerEvents: 'none',
                    }}
                  >
                    {e.name.toUpperCase()}
                  </text>
                  <text
                    y={r + 36}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={700}
                    fill="var(--text-mute)"
                    style={{
                      fontFamily: 'Inter,sans-serif',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      pointerEvents: 'none',
                    }}
                  >
                    {LORE_TYPE_META[e.type].label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div
          className="absolute left-5 bottom-5 rounded-2xl px-4 py-3.5 backdrop-blur flex flex-col gap-2 shadow-[0_8px_25px_rgba(0,0,0,0.35)]"
          style={{
            background: 'rgba(20,20,22,0.9)',
            border: '1px solid var(--line)',
          }}
        >
          <div
            className="text-[0.7rem] font-black uppercase tracking-[0.18em]"
            style={{ color: 'rgba(239,233,220,0.5)' }}
          >
            Liens
          </div>
          <LegendRow color="rgba(212,168,87,0.7)" label="Famille / Lignée" />
          <LegendRow color="rgba(116,139,61,0.7)" label="Alliance" />
          <LegendRow color="rgba(235,87,87,0.7)" label="Conflit" dashed />
          <LegendRow color="rgba(138,111,179,0.7)" label="Vassalité" dotted />
        </div>

        {/* Minimap */}
        <div
          className="absolute right-5 bottom-5 rounded-2xl overflow-hidden"
          style={{
            width: 180,
            height: 120,
            background: 'rgba(20,20,22,0.9)',
            border: '1px solid var(--line)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full">
            <rect width={W} height={H} fill="#0c0c0e" />
            {positioned.map((e) => (
              <circle
                key={e.id}
                cx={e.x}
                cy={e.y}
                r={18}
                fill={`url(#lore-grad-${e.type})`}
                opacity={e.id === selectedId ? 1 : 0.7}
              />
            ))}
            <rect
              x={vbX}
              y={vbY}
              width={vbW}
              height={vbH}
              rx={20}
              fill="none"
              stroke="var(--lgold)"
              strokeWidth={4}
              opacity={0.8}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, dashed, dotted }: { color: string; label: string; dashed?: boolean; dotted?: boolean }) {
  const bg = dashed
    ? `repeating-linear-gradient(90deg,${color} 0 5px,transparent 5px 9px)`
    : dotted
    ? `repeating-linear-gradient(90deg,${color} 0 2px,transparent 2px 5px)`
    : color;
  return (
    <div className="flex items-center gap-2.5 text-[11.5px]" style={{ color: 'var(--text-dim)' }}>
      <span style={{ width: 28, height: 2, borderRadius: 2, background: bg }} />
      {label}
    </div>
  );
}
