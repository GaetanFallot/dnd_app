import { useQuery } from '@tanstack/react-query';
import { loadDndBundle } from '@/lib/helpers/loadDndBundle';
import { useSession } from '@/stores/session';
import type {
  DndBackgroundEntry,
  DndClassEntry,
  DndFeatEntry,
  DndMonsterEntry,
  DndRaceEntry,
  DndSpellEntry,
  DndSubclassEntry,
} from '@/types/dnd';

const hourLong = { staleTime: 60 * 60 * 1000, gcTime: 60 * 60 * 1000 };

export function useDndClasses() {
  const lang = useSession((s) => s.lang);
  return useQuery({
    queryKey: ['dnd', 'classes', lang],
    queryFn: () => loadDndBundle<DndClassEntry>('classes', lang),
    ...hourLong,
  });
}

export function useDndSubclasses() {
  const lang = useSession((s) => s.lang);
  return useQuery({
    queryKey: ['dnd', 'subclasses', lang],
    queryFn: () => loadDndBundle<DndSubclassEntry>('subclasses', lang),
    ...hourLong,
  });
}

export function useDndRaces() {
  const lang = useSession((s) => s.lang);
  return useQuery({
    queryKey: ['dnd', 'races', lang],
    queryFn: () => loadDndBundle<DndRaceEntry>('races', lang),
    ...hourLong,
  });
}

export function useDndBackgrounds() {
  const lang = useSession((s) => s.lang);
  return useQuery({
    queryKey: ['dnd', 'backgrounds', lang],
    queryFn: () => loadDndBundle<DndBackgroundEntry>('backgrounds', lang),
    ...hourLong,
  });
}

export function useDndFeats() {
  const lang = useSession((s) => s.lang);
  return useQuery({
    queryKey: ['dnd', 'feats', lang],
    queryFn: () => loadDndBundle<DndFeatEntry>('feats', lang),
    ...hourLong,
  });
}

export function useDndSpells() {
  const lang = useSession((s) => s.lang);
  return useQuery({
    queryKey: ['dnd', 'spells', lang],
    queryFn: () => loadDndBundle<DndSpellEntry>('spells', lang),
    ...hourLong,
  });
}

export function useDndMonsters() {
  const lang = useSession((s) => s.lang);
  return useQuery({
    queryKey: ['dnd', 'monsters', lang],
    queryFn: () => loadDndBundle<DndMonsterEntry>('monsters', lang),
    ...hourLong,
  });
}
