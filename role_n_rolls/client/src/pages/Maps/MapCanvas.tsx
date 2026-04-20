import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  useMapAnnotations,
  useCreateMapAnnotation,
  useUpdateMapAnnotation,
  useDeleteMapAnnotation,
  type MapAnnotationRow,
  type MapRow,
} from '@/hooks/useMaps';
import { useLoreEntities, useLoreRelations, type LoreEntityRow } from '@/hooks/useLore';
import { useSession } from '@/stores/session';
import { LORE_TYPE_META } from '@/pages/LoreBuilder/meta';
import { EntityIcon, parseIconRef } from '@/components/lore/IconPicker';
import { cn } from '@/lib/utils';
import {
  Loader2,
  MapPin,
  X,
  Globe,
  Lock,
  Trash2,
  Maximize2,
  Minus,
  Plus,
  Expand,
} from 'lucide-react';

interface Props {
  map: MapRow;
  entities: Array<{ id: string; name: string }>;
  readOnly: boolean;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 6;

/**
 * Zoomable + pannable image canvas with pin-drop annotations. Wheel zooms
 * around the cursor, drag pans the image; single click on empty space drops
 * a new pin (edit mode only). Pin positions are stored in unit coords on
 * the source image, so zoom/pan never drift them.
 */
export function MapCanvas({ map, entities, readOnly }: Props) {
  const annotations = useMapAnnotations(map.id);
  const createM = useCreateMapAnnotation();
  const updateM = useUpdateMapAnnotation();
  const deleteM = useDeleteMapAnnotation();
  const { activeCampaignId } = useSession();
  const fullEntities = useLoreEntities(activeCampaignId ?? undefined);
  const fullRelations = useLoreRelations(activeCampaignId ?? undefined);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const [active, setActive] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ x: number; y: number } | null>(null);
  const [dropLabel, setDropLabel] = useState('');
  const [dropLinked, setDropLinked] = useState('');

  const [hover, setHover] = useState<{ pinId: string; x: number; y: number } | null>(null);
  const entitiesById = useMemo(
    () => new Map((fullEntities.data ?? []).map((e) => [e.id, e])),
    [fullEntities.data],
  );

  const fit = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Wheel zoom (non-passive so preventDefault works).
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setZoom((z) => {
        const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor));
        // Zoom around cursor: keep (cx,cy) anchored.
        setPan((p) => ({
          x: cx - (cx - p.x) * (next / z),
          y: cy - (cy - p.y) * (next / z),
        }));
        return next;
      });
    };
    wrap.addEventListener('wheel', onWheel, { passive: false });
    return () => wrap.removeEventListener('wheel', onWheel);
  }, []);

  // ESC leaves fullscreen.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // Ignore clicks on pins / forms — they have their own handlers.
    const target = e.target as HTMLElement;
    if (target.closest('[data-pin]') || target.closest('[data-form]')) return;
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      px: pan.x,
      py: pan.y,
      moved: false,
    };
  };
  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (d.moved) setPan({ x: d.px + dx, y: d.py + dy });
  };
  const onMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.moved) return;
    // Plain click — if on the image area and in edit mode, drop a pin.
    if (readOnly) return;
    const target = e.target as HTMLElement;
    if (!target.classList.contains('map-img')) return;
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDrop({ x, y });
    setDropLabel('');
    setDropLinked('');
    setActive(null);
  };

  const submitDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drop || !dropLabel.trim()) return;
    await createM.mutateAsync({
      map_id: map.id,
      x: drop.x,
      y: drop.y,
      label: dropLabel.trim(),
      linked_entity_id: dropLinked || null,
      is_public: map.is_public,
    });
    setDrop(null);
  };

  if (annotations.isLoading) {
    return (
      <div className="text-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-gold mx-auto" />
      </div>
    );
  }

  const rows = annotations.data ?? [];

  const canvas = (
    <div
      ref={wrapRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => (dragRef.current = null)}
      className={cn(
        'relative w-full overflow-hidden bg-night-deep/70 border border-border/60',
        fullscreen ? 'h-[100dvh]' : 'h-[75vh] rounded-lg',
        dragRef.current ? 'cursor-grabbing' : 'cursor-grab',
      )}
    >
      {/* Zoomed image layer */}
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        <img
          ref={imgRef}
          src={map.image_url}
          alt={map.title}
          className="map-img block select-none max-w-none"
          draggable={false}
        />
        {/* Pins — positioned on the image, so they scale/pan naturally. */}
        {rows.map((a) => (
          <button
            key={a.id}
            type="button"
            data-pin
            onClick={(e) => {
              e.stopPropagation();
              setActive(a.id === active ? null : a.id);
              setDrop(null);
            }}
            onMouseEnter={(e) => {
              const wrap = wrapRef.current;
              if (!wrap) return;
              const rect = wrap.getBoundingClientRect();
              setHover({
                pinId: a.id,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              });
            }}
            onMouseMove={(e) => {
              if (!hover || hover.pinId !== a.id) return;
              const wrap = wrapRef.current;
              if (!wrap) return;
              const rect = wrap.getBoundingClientRect();
              setHover({ pinId: a.id, x: e.clientX - rect.left, y: e.clientY - rect.top });
            }}
            onMouseLeave={() => setHover(null)}
            className="absolute -translate-x-1/2 -translate-y-full text-gold hover:text-parchment transition-colors drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]"
            style={{
              left: `${a.x * 100}%`,
              top: `${a.y * 100}%`,
              // Counter-scale so pins stay readable at high zoom.
              transform: `translate(-50%, -100%) scale(${1 / zoom})`,
              transformOrigin: 'center bottom',
            }}
            title={a.label}
          >
            <MapPin className="w-6 h-6" fill="currentColor" fillOpacity={0.4} />
          </button>
        ))}
        {drop && !readOnly && (
          <div
            data-pin
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{
              left: `${drop.x * 100}%`,
              top: `${drop.y * 100}%`,
              transform: `translate(-50%, -100%) scale(${1 / zoom})`,
              transformOrigin: 'center bottom',
            }}
          >
            <MapPin className="w-6 h-6 text-blood animate-pulse" fill="currentColor" fillOpacity={0.5} />
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg border border-border/60 bg-night-deep/90 backdrop-blur p-1 shadow-lg">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.25))}
          className="w-7 h-7 rounded grid place-items-center text-parchment/80 hover:text-gold hover:bg-gold/10"
          title="Zoom arrière"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="min-w-[44px] text-center text-[11px] font-mono text-muted-foreground">
          {Math.round(zoom * 100)}%
        </div>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.25))}
          className="w-7 h-7 rounded grid place-items-center text-parchment/80 hover:text-gold hover:bg-gold/10"
          title="Zoom avant"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={fit}
          className="w-7 h-7 rounded grid place-items-center text-parchment/80 hover:text-gold hover:bg-gold/10"
          title="Recentrer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setFullscreen((f) => !f)}
          className="w-7 h-7 rounded grid place-items-center text-parchment/80 hover:text-gold hover:bg-gold/10"
          title={fullscreen ? 'Sortir du plein écran (Échap)' : 'Plein écran'}
        >
          {fullscreen ? <X className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Hover detail card — shows lore entity info when hovering a pin. */}
      {hover && (() => {
        const ann = rows.find((r) => r.id === hover.pinId);
        if (!ann) return null;
        const linked = ann.linked_entity_id ? entitiesById.get(ann.linked_entity_id) : null;
        return (
          <MapHoverCard
            annotation={ann}
            entity={linked ?? null}
            relations={fullRelations.data ?? []}
            x={hover.x}
            y={hover.y}
          />
        );
      })()}

      {/* Drop form — DOM-fixed, not inside the zoomed layer. */}
      {drop && !readOnly && (
        <form
          data-form
          onSubmit={submitDrop}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 panel p-3 space-y-2 w-[28rem] max-w-[calc(100%-2rem)]"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="heading-rune text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gold" /> Nouveau point
            <button
              type="button"
              onClick={() => setDrop(null)}
              className="ml-auto text-muted-foreground hover:text-parchment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            autoFocus
            required
            type="text"
            placeholder="Libellé"
            value={dropLabel}
            onChange={(e) => setDropLabel(e.target.value)}
            className="w-full bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
          />
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Lier à une entité (optionnel)
            </span>
            <select
              value={dropLinked}
              onChange={(e) => setDropLinked(e.target.value)}
              className="bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
            >
              <option value="">—</option>
              {entities.map((en) => (
                <option key={en.id} value={en.id}>{en.name}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={!dropLabel.trim() || createM.isPending}
            className="btn-rune text-xs"
          >
            Ajouter
          </button>
        </form>
      )}
    </div>
  );

  return (
    <div className={fullscreen ? 'fixed inset-0 z-[60] bg-black' : 'mx-auto w-full'}>
      {canvas}

      {/* Active annotation editor — always below the canvas so it doesn't zoom. */}
      {active && (
        <AnnotationEditor
          annotation={rows.find((r) => r.id === active)!}
          readOnly={readOnly}
          entities={entities}
          onPatch={(patch) =>
            updateM.mutate({ id: active, map_id: map.id, patch })
          }
          onDelete={() => {
            if (window.confirm('Supprimer ce point ?')) {
              deleteM.mutate({ id: active, map_id: map.id }, { onSuccess: () => setActive(null) });
            }
          }}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

/**
 * Compact floating card shown on pin hover — mirrors the Lore detail panel
 * (hero + description + related entities) but fits in ~320px next to the
 * cursor. If the pin has no linked entity, falls back to the annotation's
 * own label + description.
 */
function MapHoverCard({
  annotation,
  entity,
  relations,
  x,
  y,
}: {
  annotation: MapAnnotationRow;
  entity: LoreEntityRow | null;
  relations: ReturnType<typeof useLoreRelations>['data'];
  x: number;
  y: number;
}) {
  const typeMeta = entity ? LORE_TYPE_META[entity.type] : null;
  const parsed = entity ? parseIconRef(entity.image_url) : { kind: 'none' as const };
  const heroUrl = parsed.kind === 'image' ? parsed.url : null;

  const myRelations = entity
    ? (relations ?? []).filter(
        (r) => r.entity_a_id === entity.id || r.entity_b_id === entity.id,
      )
    : [];

  // Clamp the card so it stays on-screen (wrapper-relative coords).
  const CARD_W = 320;
  const left = Math.max(12, Math.min(x + 14, (globalThis.innerWidth || 1200) - CARD_W - 12));
  const top = Math.max(12, y - 60);

  return (
    <div
      className="lore-theme absolute z-30 pointer-events-none rounded-[18px] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
      style={{
        left,
        top,
        width: CARD_W,
        background: 'linear-gradient(180deg,#121214,#0e0e10)',
        border: '1px solid var(--line)',
      }}
    >
      {/* Hero */}
      <div className="relative h-24" style={{ borderBottom: '1px solid var(--line)' }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            background: heroUrl
              ? `url(${heroUrl})`
              : entity
              ? 'linear-gradient(135deg,#1a1410,#3c2f20 60%,#7D654C)'
              : 'linear-gradient(135deg,#141414,#2a2a2a)',
            filter: 'saturate(0.85) contrast(1.05)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg,rgba(13,13,15,0) 10%,rgba(13,13,15,0.95) 100%)',
          }}
        />
        {typeMeta && (
          <span
            className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-[0.12em] backdrop-blur"
            style={{
              background: 'rgba(13,13,15,0.7)',
              border: '1px solid var(--line)',
              color: 'var(--lgold-2)',
            }}
          >
            {entity && (
              <EntityIcon
                type={entity.type}
                iconRef={parsed.kind === 'lucide' ? entity.image_url : null}
                size={11}
              />
            )}
            {typeMeta.label}
          </span>
        )}
        <div
          className="absolute left-3 right-3 bottom-2 cinzel"
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--lgold-2)',
            letterSpacing: '0.06em',
            textShadow: '0 2px 12px rgba(0,0,0,0.8)',
          }}
        >
          {entity?.name ?? annotation.label}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {entity?.description && (
          <p
            className="text-[11.5px] leading-snug whitespace-pre-line line-clamp-5"
            style={{ color: 'var(--text-dim)' }}
          >
            {entity.description}
          </p>
        )}
        {!entity && annotation.description && (
          <p
            className="text-[11.5px] leading-snug whitespace-pre-line line-clamp-5"
            style={{ color: 'var(--text-dim)' }}
          >
            {annotation.description}
          </p>
        )}
        {entity && myRelations.length > 0 && (
          <div>
            <div
              className="text-[9px] font-black uppercase tracking-[0.18em] mb-1"
              style={{ color: 'rgba(239,233,220,0.5)' }}
            >
              Relations · {myRelations.length}
            </div>
            <div className="flex flex-wrap gap-1">
              {myRelations.slice(0, 4).map((r) => (
                <span
                  key={r.id}
                  className="text-[9.5px] px-1.5 py-0.5 rounded border"
                  style={{
                    background: 'rgba(212,168,87,0.08)',
                    borderColor: 'rgba(212,168,87,0.3)',
                    color: 'var(--lgold-2)',
                  }}
                >
                  {r.relation_label}
                </span>
              ))}
              {myRelations.length > 4 && (
                <span className="text-[9.5px] italic" style={{ color: 'var(--text-mute)' }}>
                  +{myRelations.length - 4}
                </span>
              )}
            </div>
          </div>
        )}
        {!entity && (
          <div
            className="text-[10px] italic pt-1"
            style={{ color: 'var(--text-mute)' }}
          >
            Pas d'entité liée
          </div>
        )}
      </div>
    </div>
  );
}

function AnnotationEditor({
  annotation,
  readOnly,
  entities,
  onPatch,
  onDelete,
  onClose,
}: {
  annotation: MapAnnotationRow;
  readOnly: boolean;
  entities: Array<{ id: string; name: string }>;
  onPatch: (patch: Partial<Pick<MapAnnotationRow, 'label' | 'description' | 'linked_entity_id' | 'is_public'>>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const a = annotation;
  return (
    <div className="panel p-3 mt-3 space-y-2 max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-gold" />
        <input
          disabled={readOnly}
          type="text"
          value={a.label}
          onChange={(e) => onPatch({ label: e.target.value })}
          className="flex-1 bg-transparent font-display text-gold border-b border-transparent focus:border-gold/60 focus:outline-none"
        />
        {!readOnly && (
          <button
            type="button"
            onClick={() => onPatch({ is_public: !a.is_public })}
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1',
              a.is_public
                ? 'border-emerald-400/50 text-emerald-300'
                : 'border-border/60 text-muted-foreground',
            )}
          >
            {a.is_public ? <><Globe className="w-3 h-3" /> Public</> : <><Lock className="w-3 h-3" /> Privé</>}
          </button>
        )}
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-parchment">
          <X className="w-4 h-4" />
        </button>
      </div>
      <textarea
        disabled={readOnly}
        value={a.description ?? ''}
        onChange={(e) => onPatch({ description: e.target.value })}
        placeholder="Description"
        rows={3}
        className="w-full bg-input border border-border/60 rounded px-2 py-1 text-xs resize-y focus:outline-none focus:border-gold"
      />
      {!readOnly && (
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Entité liée</span>
          <select
            value={a.linked_entity_id ?? ''}
            onChange={(e) => onPatch({ linked_entity_id: e.target.value || null })}
            className="bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
          >
            <option value="">—</option>
            {entities.map((en) => (
              <option key={en.id} value={en.id}>{en.name}</option>
            ))}
          </select>
        </label>
      )}
      {!readOnly && (
        <button type="button" onClick={onDelete} className="btn-blood text-xs">
          <Trash2 className="w-3 h-3" /> Supprimer
        </button>
      )}
    </div>
  );
}
