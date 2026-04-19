import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  ready: boolean; // initial getSession() has resolved
  setSession: (s: Session | null) => void;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  ready: false,
  setSession: (s) => set({ session: s, user: s?.user ?? null, ready: true }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));

let bootstrapped = false;

export function initAuth() {
  if (bootstrapped) return;
  bootstrapped = true;
  void supabase.auth.getSession().then(({ data }) => {
    useAuth.getState().setSession(data.session ?? null);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.getState().setSession(session);
  });
}
