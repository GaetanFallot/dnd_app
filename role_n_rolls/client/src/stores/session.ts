import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DndLang } from '@/types/dnd';

interface SessionState {
  activeCampaignId: string | null;
  setActiveCampaign: (id: string | null) => void;

  lang: DndLang;
  setLang: (lang: DndLang) => void;

  userId: string | null;
  setUserId: (id: string | null) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      activeCampaignId: null,
      setActiveCampaign: (id) => set({ activeCampaignId: id }),

      lang: 'fr',
      setLang: (lang) => set({ lang }),

      userId: null,
      setUserId: (id) => set({ userId: id }),
    }),
    { name: 'rnr.session' },
  ),
);
