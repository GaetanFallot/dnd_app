import { useQuery } from '@tanstack/react-query';
import { loadDndBundle } from '@/lib/helpers/loadDndBundle';
import type { DndSpellEntry, SpellAreaOfEffect } from '@/types/dnd';

const hourLong = { staleTime: 60 * 60 * 1000, gcTime: 60 * 60 * 1000 };

/**
 * Area-of-effect lookup by slug.
 *
 * The FR bundle strips `area_of_effect` (0/319 entries carry it) while the EN
 * bundle preserves it (88/319). We always read EN here so the FR locale can
 * still render AoE chips without the caller knowing about the language gap.
 */
export function useDndSpellsAoe() {
  return useQuery({
    queryKey: ['dnd', 'spells', 'aoe-map'],
    queryFn: async () => {
      const list = await loadDndBundle<DndSpellEntry>('spells', 'en');
      const map: Record<string, SpellAreaOfEffect> = {};
      for (const s of list) {
        if (s.area_of_effect && (s.area_of_effect.type || typeof s.area_of_effect.size === 'number')) {
          map[s.slug] = s.area_of_effect;
        }
      }
      return map;
    },
    ...hourLong,
  });
}
