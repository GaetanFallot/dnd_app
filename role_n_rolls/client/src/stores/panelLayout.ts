import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Character-sheet panel layout — widget grid coordinates used by Gridstack.
 *
 * Each panel has `{ x, y, w, h }` where `x + w <= COLS` and `h >= 1`.
 * Gridstack owns the runtime layout; this store only persists the most
 * recent state so the sheet reopens where the user left it.
 */

export type PanelId =
  | 'identity'
  | 'combat'
  | 'deathSaves'
  | 'skills'
  | 'spells'
  | 'wealth'
  | 'resources'
  | 'equipment'
  | 'features'
  | 'personality';

export interface PanelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const COLS = 4;
export const ROW_HEIGHT = 96;

export const DEFAULT_ORDER: PanelId[] = [
  'identity', 'combat', 'deathSaves',
  'skills', 'spells', 'wealth',
  'resources', 'equipment', 'features', 'personality',
];

/** Initial widget placement on a 4-col grid. */
export const DEFAULT_SIZES: Record<PanelId, PanelRect> = {
  identity:    { x: 0, y: 0,  w: 2, h: 4 },
  combat:      { x: 2, y: 0,  w: 2, h: 4 },
  deathSaves:  { x: 2, y: 4,  w: 2, h: 2 },
  skills:      { x: 0, y: 4,  w: 2, h: 6 },
  spells:      { x: 2, y: 6,  w: 2, h: 5 },
  wealth:      { x: 0, y: 10, w: 2, h: 2 },
  resources:   { x: 2, y: 11, w: 2, h: 3 },
  equipment:   { x: 0, y: 12, w: 2, h: 4 },
  features:    { x: 2, y: 14, w: 2, h: 4 },
  personality: { x: 0, y: 16, w: 4, h: 4 },
};

export type ColumnId = 'flat';

interface LayoutState {
  order: PanelId[];
  sizes: Record<PanelId, PanelRect>;
  editMode: boolean;
  setOrder: (order: PanelId[]) => void;
  setSize: (id: PanelId, rect: PanelRect) => void;
  setSizes: (all: Record<PanelId, PanelRect>) => void;
  toggleEdit: () => void;
  setEdit: (on: boolean) => void;
  reset: () => void;
}

export function clampRect(r: PanelRect): PanelRect {
  return {
    x: Math.max(0, Math.min(COLS - 1, Math.round(r.x))),
    y: Math.max(0, Math.round(r.y)),
    w: Math.max(1, Math.min(COLS, Math.round(r.w))),
    h: Math.max(1, Math.round(r.h)),
  };
}

interface PersistedV1 {
  order?: Record<'left' | 'center' | 'right', PanelId[]>;
}

interface PersistedV2 {
  order?: PanelId[];
  sizes?: Record<PanelId, 'normal' | 'wide' | 'tall' | 'full'>;
}

interface PersistedV3 {
  order?: PanelId[];
  sizes?: Record<PanelId, { colSpan?: number; rowSpan?: number }>;
}

function flattenV1(p: PersistedV1): PanelId[] {
  const seen = new Set<PanelId>();
  const out: PanelId[] = [];
  (['left', 'center', 'right'] as const).forEach((c) => {
    for (const id of p.order?.[c] ?? []) {
      if (!seen.has(id)) {
        out.push(id);
        seen.add(id);
      }
    }
  });
  for (const id of DEFAULT_ORDER) if (!seen.has(id)) out.push(id);
  return out;
}

export const usePanelLayout = create<LayoutState>()(
  persist(
    (set) => ({
      order: DEFAULT_ORDER,
      sizes: DEFAULT_SIZES,
      editMode: false,
      setOrder: (order) => set({ order }),
      setSize: (id, rect) =>
        set((s) => ({ sizes: { ...s.sizes, [id]: clampRect(rect) } })),
      setSizes: (all) => set({ sizes: all }),
      toggleEdit: () => set((s) => ({ editMode: !s.editMode })),
      setEdit: (on) => set({ editMode: on }),
      reset: () => set({ order: DEFAULT_ORDER, sizes: DEFAULT_SIZES }),
    }),
    {
      name: 'rnr.panelLayout',
      version: 4,
      migrate: (state, fromVersion) => {
        if (!state || typeof state !== 'object') return state as LayoutState;
        // Any upgrade path from older shapes → reset to defaults. The
        // previous schemas can't round-trip cleanly into x/y anyway, and
        // users only had a handful of panels so the loss is acceptable.
        if (fromVersion < 4) {
          let order = DEFAULT_ORDER;
          if (fromVersion < 2) {
            order = flattenV1(state as PersistedV1);
          } else {
            const s = state as PersistedV2 & PersistedV3;
            if (Array.isArray(s.order)) order = s.order as PanelId[];
          }
          return {
            order,
            sizes: DEFAULT_SIZES,
            editMode: false,
          } as unknown as LayoutState;
        }
        return state as LayoutState;
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<LayoutState> | undefined;
        if (!p) return current;
        const seen = new Set<PanelId>();
        const cleanOrder: PanelId[] = [];
        for (const id of (Array.isArray(p.order) ? p.order : []) as PanelId[]) {
          if (DEFAULT_SIZES[id] && !seen.has(id)) {
            cleanOrder.push(id);
            seen.add(id);
          }
        }
        for (const id of DEFAULT_ORDER) if (!seen.has(id)) cleanOrder.push(id);

        const cleanSizes: Record<PanelId, PanelRect> = { ...DEFAULT_SIZES };
        for (const [id, rect] of Object.entries(p.sizes ?? {})) {
          const key = id as PanelId;
          if (DEFAULT_SIZES[key] && rect && typeof rect === 'object') {
            const r = rect as PanelRect;
            if (
              typeof r.x === 'number' &&
              typeof r.y === 'number' &&
              typeof r.w === 'number' &&
              typeof r.h === 'number'
            ) {
              cleanSizes[key] = clampRect(r);
            }
          }
        }
        return { ...current, ...p, order: cleanOrder, sizes: cleanSizes, editMode: false };
      },
    },
  ),
);
