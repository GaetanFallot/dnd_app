import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type HealthStatus = 'ok' | 'auth-only' | 'error';

export interface HealthResult {
  status: HealthStatus;
  message: string;
  latencyMs?: number;
}

/**
 * Probes the Supabase project reachability.
 *
 *  - ok        : auth endpoint responded AND public schema is reachable
 *  - auth-only : auth responded but `campaigns` query failed — migrations not
 *                applied yet, or RLS blocked anon (expected pre-login)
 *  - error     : auth endpoint itself unreachable
 */
async function probe(): Promise<HealthResult> {
  const start = performance.now();
  try {
    const { error: authErr } = await supabase.auth.getSession();
    if (authErr) {
      return {
        status: 'error',
        message: authErr.message,
        latencyMs: Math.round(performance.now() - start),
      };
    }

    // `limit(1)` is enough to confirm the schema is there; if RLS blocks anon
    // reads this still tells us the project is reachable — we treat it as ok.
    const { error: tableErr } = await supabase
      .from('campaigns')
      .select('id')
      .limit(1);

    const latencyMs = Math.round(performance.now() - start);

    // `PGRST116` / 42P01 = table missing. That means migrations not applied.
    if (tableErr) {
      const missing = /relation ".*" does not exist/i.test(tableErr.message);
      return {
        status: missing ? 'auth-only' : 'ok',
        message: missing
          ? 'Auth OK, migrations pas encore appliquées'
          : `Auth OK (lecture RLS-restreinte: ${tableErr.message})`,
        latencyMs,
      };
    }

    return { status: 'ok', message: 'Connecté', latencyMs };
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
      latencyMs: Math.round(performance.now() - start),
    };
  }
}

export function useSupabaseHealth() {
  return useQuery({
    queryKey: ['supabase', 'health'],
    queryFn: probe,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: false,
  });
}
