import { createContext, useContext, type ReactNode } from 'react';
import { useSecondScreen } from '@/hooks/useSecondScreen';

/**
 * Hoists the second-screen popup ownership into a provider mounted at the
 * App shell level. Without this, `useSecondScreen` was instantiated inside
 * `MJScreen`, so navigating to any other tab unmounted the hook and closed
 * the popup.
 */
const Ctx = createContext<ReturnType<typeof useSecondScreen> | null>(null);

export function SecondScreenProvider({ children }: { children: ReactNode }) {
  const api = useSecondScreen();
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useSecondScreenCtx() {
  const api = useContext(Ctx);
  if (!api) {
    throw new Error('useSecondScreenCtx must be used inside <SecondScreenProvider>');
  }
  return api;
}
