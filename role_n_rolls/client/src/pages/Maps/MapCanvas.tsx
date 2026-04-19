import { useRef, useState, type MouseEvent } from 'react';
import {
  useMapAnnotations,
  useCreateMapAnnotation,
  useUpdateMapAnnotation,
  useDeleteMapAnnotation,
  type MapAnnotationRow,
  type MapRow,
} from '@/hooks/useMaps';
import { cn } from '@/lib/utils';
import { Loader2, MapPin, X, Globe, Lock, Trash2 } from 'lucide-react';

interface Props {
  map: MapRow;
  entities: Array<{ id: string; name: string }>;
  readOnly: boolean;
}

/**
 * Simple pin-drop canvas: an <img> with absolutely-positioned markers at
 * relative coordinates (0..1). Good enough before we integrate Leaflet.
 */
export function MapCanvas({ map, entities, readOnly }: Props) {
  const annotations = useMapAnnotations(map.id);
  const createM = useCreateMapAnnotation();
  const updateM = useUpdateMapAnnotation();
  const deleteM = useDeleteMapAnnotation();

  const imgWrap = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ x: number; y: number } | null>(null);
  const [dropLabel, setDropLabel] = useState('');
  const [dropLinked, setDropLinked] = useState('');

  const onCanvasClick = (e: MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    // Only drop a pin when clicking the wrapper itself (not an existing marker).
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('map-img')) return;
    const rect = e.currentTarget.getBoundingClientRect();
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
    return <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gold mx-auto" /></div>;
  }

  const rows = annotations.data ?? [];

  return (
    <div className="mx-auto max-w-6xl w-full">
      <div
        ref={imgWrap}
        onClick={onCanvasClick}
        className={cn('relative inline-block max-w-full shadow-[0_0_30px_rgba(0,0,0,0.5)]', !readOnly && 'cursor-crosshair')}
      >
        <img
          src={map.image_url}
          alt={map.title}
          className="map-img max-w-full max-h-[80vh] block select-none"
          draggable={false}
        />
        {rows.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActive(a.id === active ? null : a.id);
              setDrop(null);
            }}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-full group',
              'text-gold hover:text-parchment transition-colors drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]',
            )}
            style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }}
            title={a.label}
          >
            <MapPin className="w-6 h-6" fill="currentColor" fillOpacity={0.4} />
          </button>
        ))}
        {drop && !readOnly && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${drop.x * 100}%`, top: `${drop.y * 100}%` }}
          >
            <MapPin className="w-6 h-6 text-blood animate-pulse" fill="currentColor" fillOpacity={0.5} />
          </div>
        )}
      </div>

      {/* Drop form */}
      {drop && !readOnly && (
        <form onSubmit={submitDrop} className="panel p-3 mt-3 space-y-2 max-w-lg mx-auto">
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
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Lier à une entité (optionnel)</span>
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
          <button type="submit" disabled={!dropLabel.trim() || createM.isPending} className="btn-rune text-xs">
            Ajouter
          </button>
        </form>
      )}

      {/* Active annotation editor */}
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
