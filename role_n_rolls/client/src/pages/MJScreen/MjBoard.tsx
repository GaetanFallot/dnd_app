import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { GridStack, type GridStackOptions, type GridStackWidget } from 'gridstack';
import {
  useMjLayout,
  DEFAULT_MJ_SIZES,
  MJ_COLS,
  MJ_ROW_HEIGHT,
  type MjWidgetId,
  type MjRect,
} from '@/stores/mjLayout';

interface Props {
  editMode: boolean;
  widgetIds: MjWidgetId[];
  renderWidget: (id: MjWidgetId) => ReactNode;
  nonce: number;
}

/**
 * Gridstack board for the Écran MJ. Same integration pattern as the
 * Character sheet: React renders once, Gridstack owns the DOM afterwards,
 * and the `change` event persists back to the `mjLayout` store.
 */
export function MjBoard({ editMode, widgetIds, renderWidget, nonce }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<GridStack | null>(null);
  const setSizes = useMjLayout((s) => s.setSizes);
  const setOrder = useMjLayout((s) => s.setOrder);

  const initialSizes = useMjLayout.getState().sizes;
  const items = useMemo(
    () =>
      widgetIds.map((id) => ({
        id,
        rect: initialSizes[id] ?? DEFAULT_MJ_SIZES[id],
      })),
    [widgetIds, nonce], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const opts: GridStackOptions = {
      column: MJ_COLS,
      cellHeight: MJ_ROW_HEIGHT,
      margin: 8,
      float: false,
      animate: true,
      disableResize: !editMode,
      disableDrag: !editMode,
      handle: '.mj-drag',
      staticGrid: false,
    };
    let grid: GridStack | null = null;
    try {
      grid = GridStack.init(opts, containerRef.current);
    } catch (err) {
      console.error('[mj-gridstack] init failed', err);
      return;
    }
    gridRef.current = grid;

    const persist = () => {
      const g = gridRef.current;
      if (!g) return;
      const saved = g.save(false) as GridStackWidget[];
      const byId: Record<MjWidgetId, MjRect> = { ...useMjLayout.getState().sizes };
      const withPos: Array<{ id: MjWidgetId; x: number; y: number }> = [];
      for (const w of saved) {
        const id = w.id as MjWidgetId | undefined;
        if (!id || !(id in DEFAULT_MJ_SIZES)) continue;
        byId[id] = {
          x: w.x ?? 0,
          y: w.y ?? 0,
          w: w.w ?? 1,
          h: w.h ?? 1,
        };
        withPos.push({ id, x: w.x ?? 0, y: w.y ?? 0 });
      }
      const orderSorted = withPos.sort((a, b) => a.y - b.y || a.x - b.x).map((p) => p.id);
      setSizes(byId);
      if (orderSorted.length) setOrder(orderSorted);
    };

    grid.on('change', persist);
    grid.on('added', persist);
    grid.on('removed', persist);

    return () => {
      try { grid?.offAll(); } catch { /* ignore */ }
      try { grid?.destroy(false); } catch { /* ignore */ }
      gridRef.current = null;
    };
  }, [nonce, widgetIds.join(','), setSizes, setOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const g = gridRef.current;
    if (!g) return;
    g.enableMove(editMode);
    g.enableResize(editMode);
  }, [editMode]);

  return (
    <div
      ref={containerRef}
      className="grid-stack"
      data-edit-mode={editMode ? 'on' : 'off'}
    >
      {items.map(({ id, rect }) => (
        <div
          key={id}
          className="grid-stack-item"
          gs-id={id}
          gs-x={rect.x}
          gs-y={rect.y}
          gs-w={rect.w}
          gs-h={rect.h}
          gs-min-w={2}
          gs-min-h={2}
          gs-max-w={MJ_COLS}
        >
          <div className="grid-stack-item-content">
            <button
              type="button"
              className="mj-drag gs-control-handle"
              title="Glisser pour déplacer"
              aria-label="Déplacer"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
                <circle cx="9" cy="6" r="1.2" />
                <circle cx="15" cy="6" r="1.2" />
                <circle cx="9" cy="12" r="1.2" />
                <circle cx="15" cy="12" r="1.2" />
                <circle cx="9" cy="18" r="1.2" />
                <circle cx="15" cy="18" r="1.2" />
              </svg>
            </button>
            <div className="gs-panel-scroll">{renderWidget(id)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
