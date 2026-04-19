import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Persisted order of character-sheet panels.
 * Shared across all characters (same user preference).
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

export const DEFAULT_ORDER: Record<ColumnId, PanelId[]> = {
  left: ['identity', 'combat', 'deathSaves'],
  center: ['skills', 'spells', 'wealth'],
  right: ['resources', 'equipment', 'features', 'personality'],
};

export type ColumnId = 'left' | 'center' | 'right';

interface LayoutState {
  order: Record<ColumnId, PanelId[]>;
  setOrder: (order: Record<ColumnId, PanelId[]>) => void;
  reset: () => void;
}

export const usePanelLayout = create<LayoutState>()(
  persist(
    (set) => ({
      order: DEFAULT_ORDER,
      setOrder: (order) => set({ order }),
      reset: () => set({ order: DEFAULT_ORDER }),
    }),
    {
      name: 'rnr.panelLayout',
      // Migrate on shape change — add missing panels at their default column.
      merge: (persisted, current) => {
        const p = persisted as Partial<LayoutState> | undefined;
        if (!p?.order) return current;
        const seen = new Set<PanelId>();
        const out: Record<ColumnId, PanelId[]> = { left: [], center: [], right: [] };
        (['left', 'center', 'right'] as ColumnId[]).forEach((c) => {
          for (const id of p.order![c] ?? []) {
            if (!seen.has(id)) {
              out[c].push(id);
              seen.add(id);
            }
          }
        });
        // Append any panels that weren't in persisted state (schema evolved).
        (['left', 'center', 'right'] as ColumnId[]).forEach((c) => {
          for (const id of DEFAULT_ORDER[c]) {
            if (!seen.has(id)) {
              out[c].push(id);
              seen.add(id);
            }
          }
        });
        return { ...current, order: out };
      },
    },
  ),
);
