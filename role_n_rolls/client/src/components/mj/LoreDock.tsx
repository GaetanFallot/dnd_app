import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '@/stores/session';
import { useLoreEntities, type LoreEntityRow } from '@/hooks/useLore';
import { LORE_TYPE_META, LORE_TYPE_ORDER } from '@/pages/LoreBuilder/meta';
import { EntityIcon, parseIconRef } from '@/components/lore/IconPicker';
import { useSecondScreenCtx } from '@/components/shared/SecondScreenProvider';
import {
  BookMarked,
  ChevronDown,
  ChevronRight,
  Cast,
  ExternalLink,
  Search,
  Loader2,
  X,
} from 'lucide-react';
import type { LoreEntityType } from '@/types/supabase';

/**
 * MJ quick-access lore panel. Lists the active campaign's entities by type
 * and lets the MJ "cast" an entity onto the second screen — the popup
 * receives a scene with a deep tint + the entity name as an overlay card.
 */
export function LoreDock() {
  const { activeCampaignId } = useSession();
  const entities = useLoreEntities(activeCampaignId ?? undefined);
  const { sendScene, isOpen } = useSecondScreenCtx();
  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<LoreEntityType | 'all'>('all');
  const [selected, setSelected] = useState<LoreEntityRow | null>(null);

  const rows = entities.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((e) => {
      if (activeType !== 'all' && e.type !== activeType) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, activeType]);

  const counts: Partial<Record<LoreEntityType, number>> = {};
  rows.forEach((e) => {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  });
  const typesShown = LORE_TYPE_ORDER.filter((t) => counts[t]);

  const castEntity = (e: LoreEntityRow) => {
    const p = parseIconRef(e.image_url);
    sendScene(
      {
        id: `lore:${e.id}`,
        name: e.name,
        tag: LORE_TYPE_META[e.type].label,
        bg: '#0a0a0c',
        emoji: '📜',
        src: p.kind === 'image' ? p.url : undefined,
        isVideo: false,
      },
      p.kind === 'image' ? 'cover' : 'center',
    );
  };

  if (!activeCampaignId) return null;

  return (
    <div className="panel p-3 space-y-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 heading-rune text-sm"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <BookMarked className="w-4 h-4" />
        Lore
        {rows.length > 0 && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-gold/15 text-gold">
            {rows.length}
          </span>
        )}
      </button>

      {open && (
        <>
          {entities.isLoading ? (
            <div className="py-3 text-center">
              <Loader2 className="w-4 h-4 animate-spin text-gold mx-auto" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              Aucune entité. Crée-en dans <Link to="/lore" className="text-gold underline">le lore</Link>.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Chercher…"
                    className="w-full bg-input border border-border/60 rounded pl-6 pr-2 py-1 text-xs focus:outline-none focus:border-gold"
                  />
                </div>
                <Link
                  to="/lore"
                  className="btn-rune text-[10px] px-2 py-1"
                  title="Ouvrir le lore complet"
                >
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* Type pills */}
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setActiveType('all')}
                  className={
                    'text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider ' +
                    (activeType === 'all'
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-border/60 text-parchment/70 hover:border-gold/40')
                  }
                >
                  Tout
                </button>
                {typesShown.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveType(t)}
                    className={
                      'text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider inline-flex items-center gap-1 ' +
                      (activeType === t
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-border/60 text-parchment/70 hover:border-gold/40')
                    }
                  >
                    <EntityIcon type={t} iconRef={null} size={10} />
                    {counts[t] ?? 0}
                  </button>
                ))}
              </div>

              <ul className="space-y-1 max-h-[40vh] overflow-y-auto">
                {filtered.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-2 rounded bg-night-deep/40 border border-border/40 hover:border-gold/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(e)}
                      className="flex-1 flex items-center gap-2 px-2 py-1.5 text-left min-w-0"
                    >
                      <EntityIcon type={e.type} iconRef={e.image_url} size={14} className="text-gold shrink-0" />
                      <span className="text-xs font-display text-parchment truncate">{e.name}</span>
                    </button>
                    {isOpen && (
                      <button
                        type="button"
                        onClick={() => castEntity(e)}
                        className="p-1.5 text-gold/70 hover:text-gold"
                        title="Envoyer sur l'écran 2"
                      >
                        <Cast className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="text-xs italic text-muted-foreground text-center py-2">
                    Pas de résultat
                  </li>
                )}
              </ul>
            </>
          )}
        </>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="panel max-w-md w-full p-4 space-y-2"
            onClick={(ev) => ev.stopPropagation()}
          >
            <header className="flex items-center gap-2">
              <EntityIcon type={selected.type} iconRef={selected.image_url} size={20} className="text-gold" />
              <h3 className="font-display font-bold text-gold text-lg flex-1 truncate">{selected.name}</h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-parchment/70 hover:text-gold"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              {LORE_TYPE_META[selected.type].label}
            </div>
            {selected.description && (
              <p className="text-sm text-parchment/80 whitespace-pre-line line-clamp-[12]">
                {selected.description}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              {isOpen && (
                <button
                  type="button"
                  onClick={() => { castEntity(selected); setSelected(null); }}
                  className="btn-rune text-xs flex-1"
                >
                  <Cast className="w-3 h-3" /> Écran 2
                </button>
              )}
              <Link
                to="/lore"
                className="btn-rune text-xs flex-1 justify-center"
                onClick={() => setSelected(null)}
              >
                <ExternalLink className="w-3 h-3" /> Ouvrir
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
