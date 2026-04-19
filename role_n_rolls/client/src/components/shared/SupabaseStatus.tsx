import { useSupabaseHealth, type HealthStatus } from '@/hooks/useSupabaseHealth';
import { cn } from '@/lib/utils';

const dotColor: Record<HealthStatus | 'loading', string> = {
  loading: 'bg-muted-foreground animate-pulse',
  ok: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]',
  'auth-only': 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]',
  error: 'bg-blood shadow-[0_0_6px_rgba(139,0,0,0.7)]',
};

const label: Record<HealthStatus | 'loading', string> = {
  loading: 'Supabase…',
  ok: 'Supabase',
  'auth-only': 'Migrations ?',
  error: 'Erreur',
};

export function SupabaseStatus() {
  const { data, isLoading } = useSupabaseHealth();
  const status: HealthStatus | 'loading' = isLoading ? 'loading' : (data?.status ?? 'error');

  const tooltip = isLoading
    ? 'Vérification de la connexion Supabase…'
    : `${data?.message ?? ''}${data?.latencyMs ? ` (${data.latencyMs} ms)` : ''}`;

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 text-xs text-parchment/70"
      title={tooltip}
    >
      <span className={cn('w-2 h-2 rounded-full', dotColor[status])} />
      <span className="font-display uppercase tracking-wider">{label[status]}</span>
      {data?.latencyMs !== undefined && status === 'ok' && (
        <span className="ml-auto text-muted-foreground">{data.latencyMs}ms</span>
      )}
    </div>
  );
}
