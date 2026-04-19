import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Scene } from '@/data/scenes';
import type { Monster } from '@/types/monster';
import { parseHp } from '@/types/monster';

export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  hp?: number;
  maxHp?: number;
  linkedMonsterId?: string;
  linkedCharacterId?: string;
}

export interface EncounterMonster {
  eid: string;
  name: string;
  data: Monster;
  hpCurrent: number;
  hpMax: number;
  notes: string;
  expanded: boolean;
}

export type FitMode = 'contain' | 'cover' | 'stretch' | 'center';

interface MjState {
  // Scene & display
  activeScene: Scene | null;
  fit: FitMode;
  blackScreen: boolean;

  // Effects
  activeOverlays: Set<string>;
  stormMode: boolean;
  masterVolume: number;

  // Initiative
  combatants: Combatant[];
  currentIdx: number;
  round: number;
  showInitOnScreen: boolean;

  // Encounter monsters
  encounterMonsters: EncounterMonster[];

  // Second screen
  secondScreen: Window | null;

  // Actions
  setActiveScene: (s: Scene | null) => void;
  setFit: (fit: FitMode) => void;
  toggleBlackScreen: () => void;
  toggleOverlay: (id: string) => void;
  clearOverlays: () => void;
  setStormMode: (on: boolean) => void;
  setMasterVolume: (v: number) => void;

  addCombatant: (c: Omit<Combatant, 'id'>) => void;
  removeCombatant: (id: string) => void;
  setCombatants: (list: Combatant[]) => void;
  sortInit: () => void;
  nextTurn: () => void;
  prevTurn: () => void;
  toggleInitDisplay: () => void;
  clearInit: () => void;

  addEncounterMonster: (m: Monster) => void;
  updateEncounterMonster: (eid: string, patch: Partial<EncounterMonster>) => void;
  removeEncounterMonster: (eid: string) => void;
  clearEncounter: () => void;

  setSecondScreen: (w: Window | null) => void;
}

const randomId = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

export const useMj = create<MjState>()(
  persist(
    (set, get) => ({
      activeScene: null,
      fit: 'contain',
      blackScreen: false,

      activeOverlays: new Set<string>(),
      stormMode: false,
      masterVolume: 0.7,

      combatants: [],
      currentIdx: 0,
      round: 1,
      showInitOnScreen: false,

      encounterMonsters: [],
      secondScreen: null,

      setActiveScene: (s) => set({ activeScene: s }),
      setFit: (fit) => set({ fit }),
      toggleBlackScreen: () => set((s) => ({ blackScreen: !s.blackScreen })),

      toggleOverlay: (id) =>
        set((s) => {
          const next = new Set(s.activeOverlays);
          next.has(id) ? next.delete(id) : next.add(id);
          return { activeOverlays: next };
        }),
      clearOverlays: () => set({ activeOverlays: new Set(), stormMode: false }),
      setStormMode: (on) => set({ stormMode: on }),
      setMasterVolume: (v) => set({ masterVolume: Math.max(0, Math.min(1, v)) }),

      addCombatant: (c) =>
        set((s) => ({ combatants: [...s.combatants, { ...c, id: randomId() }] })),
      removeCombatant: (id) =>
        set((s) => ({ combatants: s.combatants.filter((c) => c.id !== id) })),
      setCombatants: (list) => set({ combatants: list }),
      sortInit: () =>
        set((s) => ({
          combatants: [...s.combatants].sort((a, b) => b.initiative - a.initiative),
          currentIdx: 0,
          round: 1,
        })),
      nextTurn: () => {
        const { combatants, currentIdx, round } = get();
        if (!combatants.length) return;
        const nextIdx = (currentIdx + 1) % combatants.length;
        set({
          currentIdx: nextIdx,
          round: nextIdx === 0 ? round + 1 : round,
        });
      },
      prevTurn: () => {
        const { combatants, currentIdx, round } = get();
        if (!combatants.length) return;
        const prevIdx = currentIdx === 0 ? combatants.length - 1 : currentIdx - 1;
        set({
          currentIdx: prevIdx,
          round: prevIdx === combatants.length - 1 ? Math.max(1, round - 1) : round,
        });
      },
      toggleInitDisplay: () => set((s) => ({ showInitOnScreen: !s.showInitOnScreen })),
      clearInit: () => set({ combatants: [], currentIdx: 0, round: 1 }),

      addEncounterMonster: (m) =>
        set((s) => {
          const hp = parseHp(m.hit_points);
          return {
            encounterMonsters: [
              ...s.encounterMonsters,
              {
                eid: randomId(),
                name: m.name,
                data: m,
                hpCurrent: hp,
                hpMax: hp,
                notes: '',
                expanded: false,
              },
            ],
          };
        }),
      updateEncounterMonster: (eid, patch) =>
        set((s) => ({
          encounterMonsters: s.encounterMonsters.map((m) =>
            m.eid === eid ? { ...m, ...patch } : m,
          ),
        })),
      removeEncounterMonster: (eid) =>
        set((s) => ({
          encounterMonsters: s.encounterMonsters.filter((m) => m.eid !== eid),
        })),
      clearEncounter: () => set({ encounterMonsters: [] }),

      setSecondScreen: (w) => set({ secondScreen: w }),
    }),
    {
      name: 'rnr.mj',
      partialize: (s) => ({
        // Don't persist the Window ref or the Set directly (Sets don't serialize cleanly).
        activeScene: s.activeScene,
        fit: s.fit,
        masterVolume: s.masterVolume,
        combatants: s.combatants,
        currentIdx: s.currentIdx,
        round: s.round,
        showInitOnScreen: s.showInitOnScreen,
        encounterMonsters: s.encounterMonsters,
        stormMode: s.stormMode,
        activeOverlays: Array.from(s.activeOverlays),
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<MjState> & { activeOverlays?: string[] };
        return {
          ...current,
          ...p,
          activeOverlays: new Set(p.activeOverlays ?? []),
          secondScreen: null,
        };
      },
    },
  ),
);
