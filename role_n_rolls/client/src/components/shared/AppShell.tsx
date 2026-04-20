import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '@/stores/session';
import { useAuth } from '@/stores/auth';
import { useCampaign } from '@/hooks/useCampaigns';
import { cn } from '@/lib/utils';
import { SupabaseStatus } from './SupabaseStatus';
import { SecondScreenProvider } from './SecondScreenProvider';
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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const nav = [
  { to: '/session', label: 'Parties', icon: Users },
  { to: '/mj', label: 'Écran MJ', icon: Swords },
  { to: '/character', label: 'Personnage', icon: UserRound },
  { to: '/lore', label: 'Lore', icon: BookOpen },
  { to: '/maps', label: 'Cartes', icon: MapIcon },
];

const COLLAPSE_KEY = 'rnr.sidebarCollapsed';

export function AppShell() {
  const { activeCampaignId } = useSession();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const { session, ready, user, signOut } = useAuth();
  const activeCampaign = useCampaign(activeCampaignId ?? undefined);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch { /* ignore */ }
  }, [collapsed]);

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
        <Dices className="text-brand-gold w-5 h-5" />
        <div className="font-display text-brand-gold text-sm">Roll'n'Roles</div>
      </div>

      {/* Sidebar — width-animated on md+, drawer on mobile */}
      <aside
        className={cn(
          'shrink-0 border-r border-border/60 bg-night-deep/95 backdrop-blur',
          'flex flex-col overflow-hidden',
          'transition-[width,transform] duration-300 ease-out',
          'fixed md:static inset-y-0 left-0 z-40',
          mobileOpen ? 'translate-x-0 w-60' : '-translate-x-full md:translate-x-0',
          collapsed ? 'md:w-14' : 'md:w-60',
          !mobileOpen && 'w-60',
        )}
      >
        <div className={cn(
          'border-b border-border/60 flex items-center gap-2 transition-all',
          collapsed ? 'p-2 justify-center' : 'p-4',
        )}>
          <Dices className="text-brand-gold w-6 h-6 shrink-0" />
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="font-display text-brand-gold text-lg leading-tight truncate">Roll'n'Roles</div>
                <div className="text-xs text-muted-foreground font-body italic truncate">
                  {activeCampaign.data?.title ?? (activeCampaignId ? 'Campagne…' : 'Aucune campagne')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="hidden md:grid w-6 h-6 place-items-center text-muted-foreground hover:text-gold"
                title="Réduire la barre"
                aria-label="Réduire la barre latérale"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="hidden md:grid mx-auto my-2 w-8 h-8 place-items-center text-muted-foreground hover:text-gold rounded border border-transparent hover:border-gold/40"
            title="Déplier la barre"
            aria-label="Déplier la barre latérale"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        <nav className="flex-1 overflow-y-auto py-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 font-display uppercase text-sm tracking-wider',
                  'transition-colors border-l-2',
                  collapsed ? 'justify-center px-2 py-3' : 'px-4 py-2.5',
                  isActive
                    ? 'border-gold text-gold bg-gold/5'
                    : 'border-transparent text-parchment/70 hover:text-parchment hover:bg-white/[0.03]',
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={cn(
          'border-t border-border/60 space-y-1',
          collapsed ? 'p-2' : 'p-3',
        )}>
          <NavLink
            to="/settings"
            title={collapsed ? 'Paramètres' : undefined}
            className={cn(
              'flex items-center gap-3 text-sm text-parchment/70 hover:text-gold',
              collapsed ? 'justify-center py-2' : 'px-2 py-2',
            )}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Paramètres</span>}
          </NavLink>
          {!collapsed && (
            <NavLink
              to="/share"
              className="flex items-center gap-3 px-2 py-2 text-sm text-parchment/70 hover:text-gold"
            >
              <Share2 className="w-4 h-4" /> Partage
            </NavLink>
          )}
          <div className="pt-2 mt-1 border-t border-border/40 space-y-1">
            {!collapsed && (
              <div className="px-2 text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                {user?.user_metadata?.display_name || user?.email}
              </div>
            )}
            <button
              type="button"
              onClick={() => void signOut()}
              title={collapsed ? 'Déconnexion' : undefined}
              className={cn(
                'w-full flex items-center gap-2 text-xs text-parchment/70 hover:text-blood',
                collapsed ? 'justify-center py-2' : 'px-2 py-1.5',
              )}
            >
              <LogOut className="w-3 h-3 shrink-0" />
              {!collapsed && <span>Déconnexion</span>}
            </button>
            {!collapsed && <SupabaseStatus />}
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

      <SecondScreenProvider>
        <main className="flex-1 overflow-hidden bg-night pt-12 md:pt-0">
          <Outlet />
        </main>
      </SecondScreenProvider>
    </div>
  );
}
