import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '@/stores/session';
import { useAuth } from '@/stores/auth';
import { useCampaign } from '@/hooks/useCampaigns';
import { cn } from '@/lib/utils';
import { SupabaseStatus } from './SupabaseStatus';
import {
  Swords,
  UserRound,
  BookOpen,
  Map as MapIcon,
  Users,
  Share2,
  Settings,
  Dices,
  Menu,
  X,
  LogOut,
  Loader2,
} from 'lucide-react';

const nav = [
  { to: '/session', label: 'Parties', icon: Users },
  { to: '/mj', label: 'Écran MJ', icon: Swords },
  { to: '/character', label: 'Personnage', icon: UserRound },
  { to: '/lore', label: 'Lore', icon: BookOpen },
  { to: '/maps', label: 'Cartes', icon: MapIcon },
];

export function AppShell() {
  const { activeCampaignId } = useSession();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, ready, user, signOut } = useAuth();
  const activeCampaign = useCampaign(activeCampaignId ?? undefined);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  if (!session) {
    const next = encodeURIComponent(pathname);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 h-12 bg-night-deep/95 backdrop-blur border-b border-border/60 flex items-center px-3 gap-2">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="w-9 h-9 rounded border border-border/60 flex items-center justify-center text-gold hover:bg-gold/10"
          aria-label={mobileOpen ? 'Fermer' : 'Menu'}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <Dices className="text-gold w-5 h-5" />
        <div className="font-display text-gold text-sm">Role'n'Rolls</div>
      </div>

      {/* Sidebar — permanent on md+, drawer on mobile */}
      <aside
        className={cn(
          'w-60 shrink-0 border-r border-border/60 bg-night-deep/95 backdrop-blur',
          'flex flex-col transition-transform duration-200',
          'fixed md:static inset-y-0 left-0 z-40 md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="p-4 border-b border-border/60 flex items-center gap-2">
          <Dices className="text-gold w-6 h-6" />
          <div className="min-w-0">
            <div className="font-display text-gold text-lg leading-tight truncate">Role'n'Rolls</div>
            <div className="text-xs text-muted-foreground font-body italic truncate">
              {activeCampaign.data?.title ?? (activeCampaignId ? 'Campagne…' : 'Aucune campagne')}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 font-display uppercase text-sm tracking-wider',
                  'transition-colors border-l-2',
                  isActive
                    ? 'border-gold text-gold bg-gold/5'
                    : 'border-transparent text-parchment/70 hover:text-parchment hover:bg-white/[0.03]',
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border/60 p-3 space-y-1">
          <NavLink
            to="/share"
            className="flex items-center gap-3 px-2 py-2 text-sm text-parchment/70 hover:text-gold"
          >
            <Share2 className="w-4 h-4" /> Partage
          </NavLink>
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-2 py-2 text-sm text-parchment/70 hover:text-gold"
          >
            <Settings className="w-4 h-4" /> Paramètres
          </NavLink>
          <div className="pt-2 mt-1 border-t border-border/40 space-y-1">
            <div className="px-2 text-[10px] uppercase tracking-wider text-muted-foreground truncate">
              {user?.user_metadata?.display_name || user?.email}
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-parchment/70 hover:text-blood"
            >
              <LogOut className="w-3 h-3" /> Déconnexion
            </button>
            <SupabaseStatus />
          </div>
        </div>
      </aside>

      {/* Scrim on mobile */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-black/70 backdrop-blur-sm"
        />
      )}

      <main className="flex-1 overflow-hidden bg-night pt-12 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
