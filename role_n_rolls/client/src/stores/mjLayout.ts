import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Gridstack layout for the MJ board — mirrors `panelLayout` but for the
 * Écran MJ widgets so the MJ can re-arrange the table to their liking.
 */

export type MjWidgetId =
  | 'secondScreen'
  | 'overlays'
  | 'soundboard'
  | 'maps'
  | 'lore'
  | 'sceneImport'
  | 'nowPlaying'
  | 'scenes'
  | 'imports'
  | 'initiative';

export interface MjRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MJ_COLS = 12;
export const MJ_ROW_HEIGHT = 70;

export const DEFAULT_MJ_ORDER: MjWidgetId[] = [
  'secondScreen', 'overlays', 'soundboard', 'maps', 'lore',
  'sceneImport', 'nowPlaying', 'scenes', 'imports', 'initiative',
];

export const DEFAULT_MJ_SIZES: Record<MjWidgetId, MjRect> = {
  secondScreen: { x: 0, y: 0,  w: 3, h: 5 },
  overlays:     { x: 0, y: 5,  w: 3, h: 6 },
  soundboard:   { x: 0, y: 11, w: 3, h: 6 },
  maps:         { x: 0, y: 17, w: 3, h: 4 },
  lore:         { x: 0, y: 21, w: 3, h: 5 },
  sceneImport:  { x: 0, y: 26, w: 3, h: 3 },
  nowPlaying:   { x: 3, y: 0,  w: 6, h: 2 },
  scenes:       { x: 3, y: 2,  w: 6, h: 8 },
  imports:      { x: 3, y: 10, w: 6, h: 4 },
  initiative:   { x: 9, y: 0,  w: 3, h: 14 },
};

interface MjLayoutState {
  order: MjWidgetId[];
  sizes: Record<MjWidgetId, MjRect>;
  editMode: boolean;
  setOrder: (o: MjWidgetId[]) => void;
  setSizes: (all: Record<MjWidgetId, MjRect>) => void;
  toggleEdit: () => void;
  reset: () => void;
}

export const useMjLayout = create<MjLayoutState>()(
  persist(
    (set) => ({
      order: DEFAULT_MJ_ORDER,
      sizes: DEFAULT_MJ_SIZES,
      editMode: false,
      setOrder: (order) => set({ order }),
      setSizes: (sizes) => set({ sizes }),
      toggleEdit: () => set((s) => ({ editMode: !s.editMode })),
      reset: () => set({ order: DEFAULT_MJ_ORDER, sizes: DEFAULT_MJ_SIZES }),
    }),
    {
      name: 'rnr.mjLayout',
      version: 1,
    },
  ),
);
