import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { GridStack, type GridStackOptions, type GridStackWidget } from 'gridstack';
import {
  usePanelLayout,
  DEFAULT_SIZES,
  COLS,
  ROW_HEIGHT,
  type PanelId,
  type PanelRect,
} from '@/stores/panelLayout';

interface Props {
  editMode: boolean;
  panelIds: PanelId[];
  renderPanel: (id: PanelId) => ReactNode;
  /**
   * Bump this to force a full re-init (e.g., after "Reset layout"). Panel
   * ID changes also trigger a re-init since Gridstack keeps DOM refs.
   */
  nonce: number;
}

/**
 * React wrapper around Gridstack. The DOM (static handle + picker) always
 * renders so Gridstack keeps its element refs stable — edit-mode controls
 * are hidden through CSS (`data-edit-mode=off`) rather than unmounted.
 */
export function GridstackSheet({ editMode, panelIds, renderPanel, nonce }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<GridStack | null>(null);
  const setSizes = usePanelLayout((s) => s.setSizes);
  const setOrder = usePanelLayout((s) => s.setOrder);

  // Snapshot the current sizes when we render so the initial gs-* attributes
  // reflect the persisted layout. Subsequent writes flow Gridstack → store.
  const initialSizes = usePanelLayout.getState().sizes;
  const items = useMemo(
    () =>
      panelIds.map((id) => ({
        id,
        rect: initialSizes[id] ?? DEFAULT_SIZES[id],
      })),
    [panelIds, nonce], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const opts: GridStackOptions = {
      column: COLS,
      cellHeight: ROW_HEIGHT,
      margin: 8,
      float: false,
      animate: true,
      disableResize: !editMode,
      disableDrag: !editMode,
      // Whole widget body is draggable (match gridstackjs.com demo feel);
      // inputs/buttons/links/scrollable content opt out via `cancel` so typing
      // and clicks don't accidentally start a drag. React's onMouseDown
      // stopPropagation on a button would ALSO block drag, which is why the
      // legacy `.gs-drag` handle is now a visual affordance only.
      handle: '.grid-stack-item-content',
      draggable: {
        handle: '.grid-stack-item-content',
        cancel:
          'input, textarea, button, select, option, a, [contenteditable="true"], .gs-width-picker',
        appendTo: 'body',
      },
      staticGrid: false,
    };

    let grid: GridStack | null = null;
    try {
      grid = GridStack.init(opts, containerRef.current);
    } catch (err) {
      console.error('[gridstack] init failed', err);
      return;
    }
    gridRef.current = grid;

    const persist = () => {
      const g = gridRef.current;
      if (!g) return;
      const saved = g.save(false) as GridStackWidget[];
      const byId: Record<PanelId, PanelRect> = { ...usePanelLayout.getState().sizes };
      const withPos: Array<{ id: PanelId; x: number; y: number }> = [];
      for (const w of saved) {
        const id = w.id as PanelId | undefined;
        if (!id || !(id in DEFAULT_SIZES)) continue;
        byId[id] = {
          x: w.x ?? 0,
          y: w.y ?? 0,
          w: w.w ?? 1,
          h: w.h ?? 1,
        };
        withPos.push({ id, x: w.x ?? 0, y: w.y ?? 0 });
      }
      const orderSorted = withPos
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((p) => p.id);
      setSizes(byId);
      if (orderSorted.length) setOrder(orderSorted);
    };

    grid.on('change', persist);
    grid.on('added', persist);
    grid.on('removed', persist);

    return () => {
      try {
        grid?.offAll();
      } catch {
        /* ignore */
      }
      try {
        grid?.destroy(false);
      } catch {
        /* ignore */
      }
      gridRef.current = null;
    };
  }, [nonce, panelIds.join(','), setSizes, setOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle edit without re-init.
  useEffect(() => {
    const g = gridRef.current;
    if (!g) return;
    g.enableMove(editMode);
    g.enableResize(editMode);
  }, [editMode]);

  const setWidth = (id: PanelId, w: number) => {
    const g = gridRef.current;
    const root = containerRef.current;
    if (!g || !root) return;
    const el = root.querySelector(`[gs-id="${CSS.escape(id)}"]`) as HTMLElement | null;
    if (!el) return;
    g.update(el, { w });
  };

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
          gs-min-w={1}
          gs-min-h={2}
          gs-max-w={COLS}
        >
          <div className="grid-stack-item-content">
            {/* Drag affordance — purely decorative: the whole card is the drag
                handle now (gridstackjs.com demo feel). `pointer-events: none`
                in CSS keeps this out of the way so it doesn't compete with
                `cancel` selectors or block drag initiation. */}
            <span
              className="gs-drag gs-control-handle"
              aria-hidden
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
                <circle cx="9" cy="6" r="1.2" />
                <circle cx="15" cy="6" r="1.2" />
                <circle cx="9" cy="12" r="1.2" />
                <circle cx="15" cy="12" r="1.2" />
                <circle cx="9" cy="18" r="1.2" />
                <circle cx="15" cy="18" r="1.2" />
              </svg>
            </span>
            <div className="gs-panel-scroll">{renderPanel(id)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Four-button width selector (1/2/3/4) — subscribes to the current rect so
 * the active button stays in sync when users drag-resize instead.
 */
function WidthPicker({
  id,
  onPick,
}: {
  id: PanelId;
  onPick: (id: PanelId, w: number) => void;
}) {
  const w = usePanelLayout((s) => (s.sizes[id] ?? DEFAULT_SIZES[id]).w);
  return (
    <div className="gs-width-picker">
      {[1, 2, 3, 4].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPick(id, n)}
          title={`Largeur ${n} / ${COLS}`}
          className={n === w ? 'on' : ''}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
