import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { LORE_TYPE_META } from '@/pages/LoreBuilder/meta';
import type { LoreEntityRow, LoreRelationRow, LoreEventRow } from '@/hooks/useLore';
import type { MapRow } from '@/hooks/useMaps';
import { cn } from '@/lib/utils';
import { BookMarked, Link as LinkIcon, Activity, Map as MapIcon, Compass, Loader2 } from 'lucide-react';
import { EntityIcon } from '@/components/lore/IconPicker';

type Tab = 'entities' | 'relations' | 'events' | 'maps';

/**
 * Public read-only view of a campaign's lore, accessed via an anonymous share
 * token. All reads go through SECURITY DEFINER RPCs so RLS stays strict for
 * authenticated users.
 */
export function PublicLorePage() {
  const { token } = useParams<{ token: string }>();
  const [tab, setTab] = useState<Tab>('entities');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const bundle = useQuery({
    queryKey: ['public-lore', token],
    enabled: !!token,
    queryFn: async () => {
      if (!token) throw new Error('Token manquant');
      const [resolved, entities, relations, events, maps] = await Promise.all([
        supabase.rpc('resolve_share_token', { p_token: token }),
        supabase.rpc('public_lore_entities', { p_token: token }),
        supabase.rpc('public_lore_relations', { p_token: token }),
        supabase.rpc('public_lore_events', { p_token: token }),
        supabase.rpc('public_maps', { p_token: token }),
      ]);
      if (resolved.error) throw resolved.error;
      const campaignId = resolved.data as unknown as string | null;
      if (!campaignId) throw new Error('Lien invalide ou expiré');
      if (entities.error) throw entities.error;
      if (relations.error) throw relations.error;
      if (events.error) throw events.error;
      if (maps.error) throw maps.error;
      return {
        campaignId,
        entities: (entities.data ?? []) as LoreEntityRow[],
        relations: (relations.data ?? []) as LoreRelationRow[],
        events: (events.data ?? []) as Omit<LoreEventRow, 'linked_entity_ids'>[],
        maps: (maps.data ?? []) as MapRow[],
      };
    },
  });

  const entityById = useMemo(
    () => new Map(bundle.data?.entities.map((e) => [e.id, e]) ?? []),
    [bundle.data?.entities],
  );

  if (bundle.isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (bundle.isError) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <div className="panel p-6 max-w-md text-center space-y-3">
          <Compass className="w-8 h-8 text-blood mx-auto" />
          <h1 className="heading-rune text-xl">Lien invalide</h1>
          <p className="text-muted-foreground text-sm">
            {(bundle.error as Error).message}
          </p>
        </div>
      </div>
    );
  }

  const data = bundle.data!;
  const selected = selectedId ? entityById.get(selectedId) ?? null : null;

  return (
    <div className="min-h-[100dvh] bg-night">
      <header className="px-6 py-4 border-b border-border/60 flex items-center gap-3 flex-wrap">
        <h1 className="heading-rune text-2xl flex-1">📜 Lore partagé</h1>
        <span className="text-[10px] text-muted-foreground">lecture seule</span>
        <nav className="flex gap-1 bg-night-deep/70 rounded p-0.5">
          {(
            [
              ['entities', `Entités (${data.entities.length})`, BookMarked],
              ['relations', `Relations (${data.relations.length})`, LinkIcon],
              ['events', `Événements (${data.events.length})`, Activity],
              ['maps', `Cartes (${data.maps.length})`, MapIcon],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-display uppercase tracking-wider flex items-center gap-1.5',
                tab === id ? 'bg-gold/15 text-gold' : 'text-parchment/70 hover:text-parchment',
              )}
            >
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {tab === 'entities' && (
          <div className="grid gap-4 md:grid-cols-[260px_1fr]">
            <aside className="panel p-0 overflow-hidden max-h-[70vh] overflow-y-auto">
              {data.entities.length === 0 ? (
                <p className="p-4 text-sm italic text-muted-foreground text-center">
                  Aucune entité publique.
                </p>
              ) : (
                <ul>
                  {data.entities.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(e.id)}
                        className={cn(
                          'w-full text-left px-3 py-2 flex items-center gap-2 text-sm border-l-2 hover:bg-gold/5',
                          selectedId === e.id
                            ? 'border-gold bg-gold/10 text-gold'
                            : 'border-transparent',
                        )}
                      >
                        <EntityIcon type={e.type} iconRef={e.image_url} size={16} />
                        <span className="flex-1 truncate">{e.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
            <section className="panel p-6">
              {selected ? (
                <div className="space-y-3">
                  <header className="flex items-start gap-3">
                    <div
                      className="w-20 h-20 rounded border-2 border-gold/40 bg-night-deep shrink-0 flex items-center justify-center text-3xl bg-cover bg-center"
                      style={selected.image_url ? { backgroundImage: `url(${selected.image_url})` } : undefined}
                    >
                      {!selected.image_url && <EntityIcon type={selected.type} iconRef={selected.image_url} size={28} className="text-gold" />}
                    </div>
                    <div>
                      <h2 className="font-display text-gold text-2xl">{selected.name}</h2>
                      <div className="text-xs text-muted-foreground italic">
                        {LORE_TYPE_META[selected.type].label}
                      </div>
                    </div>
                  </header>
                  <p className="whitespace-pre-line text-sm text-parchment/90">{selected.description}</p>
                </div>
              ) : (
                <p className="italic text-muted-foreground text-center py-8">
                  Sélectionne une entité.
                </p>
              )}
            </section>
          </div>
        )}

        {tab === 'relations' && (
          data.relations.length === 0 ? (
            <p className="text-center italic text-muted-foreground">Aucune relation publique.</p>
          ) : (
            <ul className="space-y-1 max-w-3xl mx-auto">
              {data.relations.map((r) => {
                const a = entityById.get(r.entity_a_id);
                const b = entityById.get(r.entity_b_id);
                return (
                  <li key={r.id} className="panel flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="font-display font-bold text-gold flex items-center gap-1.5">
                      {a && <EntityIcon type={a.type} iconRef={a.image_url} size={14} />}
                      {a ? a.name : '—'}
                    </span>
                    <span className="text-xs text-muted-foreground italic">→ {r.relation_label}</span>
                    <span className="font-display font-bold text-gold flex-1 truncate flex items-center gap-1.5">
                      {b && <EntityIcon type={b.type} iconRef={b.image_url} size={14} />}
                      {b ? b.name : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )
        )}

        {tab === 'events' && (
          data.events.length === 0 ? (
            <p className="text-center italic text-muted-foreground">Aucun événement public.</p>
          ) : (
            <ol className="relative border-l-2 border-gold/30 ml-3 space-y-4 max-w-3xl mx-auto">
              {data.events.map((ev) => (
                <li key={ev.id} className="ml-4">
                  <span className="absolute -left-[7px] w-3 h-3 rounded-full bg-gold border-2 border-night-deep" />
                  <div className="panel p-3 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <h3 className="font-display text-gold flex-1">{ev.title}</h3>
                      <time className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(ev.created_at).toLocaleDateString()}
                      </time>
                    </div>
                    {ev.description && (
                      <p className="text-sm whitespace-pre-line text-parchment/80">{ev.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )
        )}

        {tab === 'maps' && (
          data.maps.length === 0 ? (
            <p className="text-center italic text-muted-foreground">Aucune carte publique.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.maps.map((m) => (
                <figure key={m.id} className="panel p-2 space-y-2">
                  <img src={m.image_url} alt={m.title} className="w-full max-h-96 object-contain rounded" />
                  <figcaption className="font-display text-gold text-sm px-1">{m.title}</figcaption>
                </figure>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}
