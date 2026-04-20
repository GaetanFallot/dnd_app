import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLoreEvents, useLoreEntities } from '@/hooks/useLore';
import { LORE_TYPE_META } from '@/pages/LoreBuilder/meta';
import { EntityIcon } from '@/components/lore/IconPicker';
import { Activity, Globe, Loader2 } from 'lucide-react';

interface Props {
  campaignId: string;
}

/**
 * Recent activity feed for the active campaign — shows the last public
 * `lore_events`, oldest→newest, with icons for linked entities. Players see
 * just the public flow; the MJ sees everything (RLS).
 */
export function ActiveCampaignFeed({ campaignId }: Props) {
  const events = useLoreEvents(campaignId);
  const entities = useLoreEntities(campaignId);

  const byId = useMemo(
    () => new Map(entities.data?.map((e) => [e.id, e]) ?? []),
    [entities.data],
  );

  const latest = useMemo(
    () => (events.data ?? []).slice(0, 8),
    [events.data],
  );

  return (
    <section className="panel p-4 space-y-3">
      <h2 className="heading-rune text-sm flex items-center gap-2">
        <Activity className="w-4 h-4 text-gold" /> Journal de la partie
        <Link
          to="/lore"
          className="ml-auto text-[10px] uppercase tracking-wider text-parchment/70 hover:text-gold"
        >
          Ouvrir le lore →
        </Link>
      </h2>

      {events.isLoading ? (
        <div className="py-6 text-center">
          <Loader2 className="w-4 h-4 animate-spin text-gold mx-auto" />
        </div>
      ) : latest.length === 0 ? (
        <p className="italic text-muted-foreground text-sm">
          Aucun événement pour le moment. Crée-en depuis l'onglet Événements du lore.
        </p>
      ) : (
        <ol className="relative border-l-2 border-gold/30 ml-2 space-y-3">
          {latest.map((ev) => (
            <li key={ev.id} className="ml-3">
              <span className="absolute -left-[7px] w-3 h-3 rounded-full bg-gold border-2 border-night-deep" />
              <div className="bg-night-deep/40 rounded p-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <h3 className="font-display font-bold text-gold flex-1 text-sm">{ev.title}</h3>
                  {ev.is_public && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 font-bold uppercase tracking-wider"
                      style={{
                        borderColor: 'rgba(116,139,61,0.45)',
                        color: '#a4bf5f',
                        background: 'rgba(116,139,61,0.1)',
                      }}
                    >
                      <Globe className="w-2.5 h-2.5" /> Public
                    </span>
                  )}
                  <time className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(ev.created_at).toLocaleDateString()}
                  </time>
                </div>
                {ev.description && (
                  <p className="text-xs whitespace-pre-line text-parchment/80 line-clamp-3">
                    {ev.description}
                  </p>
                )}
                {ev.linked_entity_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {ev.linked_entity_ids.map((eid) => {
                      const ent = byId.get(eid);
                      if (!ent) return null;
                      return (
                        <span
                          key={eid}
                          className="text-[10px] px-1.5 py-0.5 rounded border border-gold/30 text-gold/80 flex items-center gap-1"
                        >
                          <EntityIcon type={ent.type} iconRef={ent.image_url} size={10} />
                          {LORE_TYPE_META[ent.type].label} · {ent.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
