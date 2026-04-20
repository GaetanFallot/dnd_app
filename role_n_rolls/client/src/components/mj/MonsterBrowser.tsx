import { useMemo, useState } from 'react';
import { useDndMonsters } from '@/hooks/useDndData';
import { useSession } from '@/stores/session';
import { useMj } from '@/stores/mj';
import { useCustomMonstersDb } from '@/hooks/useCustomMonstersDb';
import { parseCr, type Monster } from '@/types/monster';
import { StatBlock } from './StatBlock';
import { cn } from '@/lib/utils';
import { Search, X, Plus, Pencil, Copy, Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onEdit: (monster: Monster) => void;
  onDuplicate: (monster: Monster) => void;
}

type TabId = 'library' | 'custom';

export function MonsterBrowser({ open, onClose, onEdit, onDuplicate }: Props) {
  const { data: library = [], isLoading } = useDndMonsters();
  const { lang, setLang } = useSession();
  const { addEncounterMonster } = useMj();
  const { monsters: custom, remove: removeCustom } = useCustomMonstersDb();

  const [tab, setTab] = useState<TabId>('library');
  const [search, setSearch] = useState('');
  const [crMin, setCrMin] = useState('');
  const [crMax, setCrMax] = useState('30');
  const [type, setType] = useState('');
  const [size, setSize] = useState('');
  const [selected, setSelected] = useState<Monster | null>(null);

  const source = tab === 'library' ? (library as Monster[]) : custom;

  const types = useMemo(() => {
    const set = new Set<string>();
    for (const m of source) {
      const t = String(m.type ?? '').split(/[,(]/)[0].trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort();
  }, [source]);

  const sizes = useMemo(() => {
    const set = new Set<string>();
    for (const m of source) {
      if (m.size) set.add(String(m.size));
    }
    return Array.from(set).sort();
  }, [source]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const crMinN = crMin === '' ? -Infinity : Number(crMin);
    const crMaxN = crMax === '' ? Infinity : Number(crMax);
    return source.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q)) return false;
      const cr = parseCr(m.challenge_rating ?? m.cr);
      if (cr !== null && (cr < crMinN || cr > crMaxN)) return false;
      if (type && !String(m.type ?? '').toLowerCase().includes(type.toLowerCase())) return false;
      if (size && String(m.size ?? '').toLowerCase() !== size.toLowerCase()) return false;
      return true;
    });
  }, [source, search, crMin, crMax, type, size]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/85 flex items-stretch justify-center p-4">
      <div className="panel flex flex-col w-full max-w-6xl max-h-full overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border/60 bg-night-deep/80">
          <div className="flex gap-1 bg-night rounded p-0.5">
            <button
              type="button"
              onClick={() => setTab('library')}
              className={cn(
                'px-3 py-1 rounded text-xs font-display uppercase tracking-wider',
                tab === 'library' ? 'bg-gold/15 text-gold' : 'text-parchment/70',
              )}
            >
              📖 Bibliothèque ({library.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('custom')}
              className={cn(
                'px-3 py-1 rounded text-xs font-display uppercase tracking-wider',
                tab === 'custom' ? 'bg-gold/15 text-gold' : 'text-parchment/70',
              )}
            >
              🐉 Mes monstres ({custom.length})
            </button>
          </div>
          <span className="text-xs text-muted-foreground flex-1">
            {isLoading ? 'Chargement…' : `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`}
          </span>
          <div className="flex gap-1 bg-night rounded p-0.5">
            {(['fr', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-display uppercase',
                  lang === l ? 'bg-gold text-night' : 'text-parchment/70',
                )}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-parchment text-xl leading-none"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border/60">
          <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            FP
            <input
              type="number"
              placeholder="Min"
              min="0"
              max="30"
              step="0.25"
              value={crMin}
              onChange={(e) => setCrMin(e.target.value)}
              className="w-14 bg-input border border-border/60 rounded px-1 py-1 text-xs focus:outline-none focus:border-gold"
            />
            –
            <input
              type="number"
              placeholder="Max"
              min="0"
              max="30"
              step="0.25"
              value={crMax}
              onChange={(e) => setCrMax(e.target.value)}
              className="w-14 bg-input border border-border/60 rounded px-1 py-1 text-xs focus:outline-none focus:border-gold"
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="bg-input border border-border/60 rounded px-2 py-1 text-xs focus:outline-none focus:border-gold"
          >
            <option value="">Tous types</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="bg-input border border-border/60 rounded px-2 py-1 text-xs focus:outline-none focus:border-gold"
          >
            <option value="">Toutes tailles</option>
            {sizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto min-w-0 border-r border-border/60">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground italic">
                {isLoading ? 'Chargement des bundles…' : 'Aucun résultat'}
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {filtered.map((m, i) => (
                  <li key={(m.slug as string) ?? `${m.name}-${i}`}>
                    <button
                      type="button"
                      onClick={() => setSelected(m)}
                      className={cn(
                        'w-full text-left flex items-center gap-3 px-3 py-1.5 text-sm',
                        'hover:bg-gold/5 transition-colors',
                        selected?.name === m.name && 'bg-gold/10',
                      )}
                    >
                      <span className="font-display text-parchment flex-1 truncate">{m.name}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[40%]">
                        {String(m.type ?? m.size ?? '')}
                      </span>
                      <span className="text-xs text-gold w-12 text-right">
                        FP {String(m.challenge_rating ?? m.cr ?? '—')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="w-[380px] overflow-y-auto p-4 bg-night-deep/60">
            {selected ? (
              <>
                <StatBlock monster={selected} compact />
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      addEncounterMonster({ ...selected, source: (selected.source ?? 'srd') as Monster['source'] });
                    }}
                    className="btn-rune w-full"
                  >
                    <Plus className="w-4 h-4" /> Ajouter à la rencontre
                  </button>
                  {selected.source === 'custom' ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(selected)}
                        className="btn-rune flex-1 text-xs"
                      >
                        <Pencil className="w-3 h-3" /> Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicate(selected)}
                        className="btn-rune flex-1 text-xs"
                      >
                        <Copy className="w-3 h-3" /> Dupliquer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selected.slug) return;
                          if (!window.confirm(`Supprimer "${selected.name}" ?`)) return;
                          void removeCustom(selected.slug);
                          setSelected(null);
                        }}
                        className="btn-blood text-xs"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onDuplicate(selected)}
                      className="btn-rune w-full text-xs"
                      title="Cloner ce monstre SRD en personnalisé pour l'éditer"
                    >
                      <Copy className="w-3 h-3" /> Dupliquer pour éditer
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="italic text-muted-foreground text-center pt-16">
                Clique sur un monstre pour voir sa fiche.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
