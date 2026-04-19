import { useMemo, useState } from 'react';
import { useDndSpells } from '@/hooks/useDndData';
import type { DnDSpell } from '@/types/character';
import type { DndSpellEntry } from '@/types/dnd';
import { SPELL_SCHOOLS } from '@/lib/helpers/dndRules';
import { cn } from '@/lib/utils';
import { Search, X, Plus } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (spell: DnDSpell) => void;
  existingNames: Set<string>;
}

/** Convert an SRD/wikidot spell entry into the legacy DnDSpell shape. */
function toSheetSpell(entry: DndSpellEntry): DnDSpell {
  const comp = entry.components ?? {};
  return {
    prepared: true,
    level: entry.level,
    school: entry.school ?? '',
    name: entry.name,
    range: entry.range ?? '',
    duration: entry.duration ?? '',
    v: !!comp.v,
    s: !!comp.s,
    m: !!comp.m,
    summary: entry.description ?? '',
    expanded: false,
    casting_time: entry.casting_time,
    material: comp.material,
    concentration: entry.concentration,
    ritual: entry.ritual,
    classes: entry.classes,
    higher_level: entry.higher_level,
  };
}

export function SpellBrowser({ open, onClose, onPick, existingNames }: Props) {
  const { data = [], isLoading } = useDndSpells();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<string>('');
  const [school, setSchool] = useState('');
  const [selected, setSelected] = useState<DndSpellEntry | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const lvl = level === '' ? null : Number(level);
    return (data as DndSpellEntry[]).filter((s) => {
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (lvl !== null && s.level !== lvl) return false;
      if (school && !(s.school ?? '').toLowerCase().includes(school.toLowerCase())) return false;
      return true;
    });
  }, [data, search, level, school]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/85 flex items-stretch justify-center p-4">
      <div className="panel flex flex-col w-full max-w-5xl max-h-full overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
          <h2 className="heading-rune text-lg flex-1">📚 Bibliothèque de sorts</h2>
          <span className="text-xs text-muted-foreground">
            {isLoading ? 'Chargement…' : `${filtered.length} résultats`}
          </span>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-parchment">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border/60">
          <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un sort…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
            />
          </div>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="bg-input border border-border/60 rounded px-2 py-1 text-xs focus:outline-none focus:border-gold"
          >
            <option value="">Tous niveaux</option>
            <option value="0">Cantrip</option>
            {Array.from({ length: 9 }, (_, i) => i + 1).map((l) => (
              <option key={l} value={l}>Niveau {l}</option>
            ))}
          </select>
          <select
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="bg-input border border-border/60 rounded px-2 py-1 text-xs focus:outline-none focus:border-gold"
          >
            <option value="">Toutes écoles</option>
            {SPELL_SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto min-w-0 border-r border-border/60">
            <ul className="divide-y divide-border/40">
              {filtered.map((s) => {
                const already = existingNames.has(s.name);
                return (
                  <li key={s.slug}>
                    <button
                      type="button"
                      onClick={() => setSelected(s)}
                      className={cn(
                        'w-full text-left flex items-center gap-3 px-3 py-1.5 text-sm hover:bg-gold/5',
                        selected?.slug === s.slug && 'bg-gold/10',
                      )}
                    >
                      <span className="w-6 text-center text-xs text-gold">{s.level || 'C'}</span>
                      <span className="flex-1 font-display text-parchment truncate">{s.name}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[40%]">{s.school}</span>
                      {already && <span className="text-[10px] text-gold/70 italic">ajouté</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="w-[360px] overflow-y-auto p-4 bg-night-deep/60">
            {selected ? (
              <>
                <h3 className="font-display text-gold text-lg leading-tight">{selected.name}</h3>
                {typeof selected.name_en === 'string' && selected.name_en && selected.name_en !== selected.name && (
                  <div className="text-[11px] text-muted-foreground italic">{String(selected.name_en)}</div>
                )}
                <div className="text-xs text-muted-foreground italic">
                  {selected.level === 0 ? 'Cantrip' : `Niveau ${selected.level}`}
                  {selected.school ? ` — ${selected.school}` : ''}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selected.concentration && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-900/20 text-blue-300 border-blue-500/30 font-display tracking-wide">
                      Concentration
                    </span>
                  )}
                  {selected.ritual && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-purple-900/20 text-purple-300 border-purple-500/30 font-display tracking-wide">
                      Rituel
                    </span>
                  )}
                </div>
                <table className="w-full mt-3 text-xs border-collapse">
                  <tbody>
                    {selected.casting_time && (
                      <tr className="border-b border-border/30"><td className="text-gold py-0.5 pr-2 w-[45%]">Temps d'incantation</td><td className="py-0.5">{selected.casting_time}</td></tr>
                    )}
                    {selected.range && (
                      <tr className="border-b border-border/30"><td className="text-gold py-0.5 pr-2">Portée</td><td className="py-0.5">{selected.range}</td></tr>
                    )}
                    <tr className="border-b border-border/30">
                      <td className="text-gold py-0.5 pr-2">Composantes</td>
                      <td className="py-0.5">
                        {[selected.components?.v && 'V', selected.components?.s && 'S', selected.components?.m && 'M'].filter(Boolean).join(', ') || '—'}
                        {selected.components?.material && (
                          <span className="text-muted-foreground italic"> ({selected.components.material})</span>
                        )}
                      </td>
                    </tr>
                    {selected.duration && (
                      <tr className="border-b border-border/30"><td className="text-gold py-0.5 pr-2">Durée</td><td className="py-0.5">{selected.duration}</td></tr>
                    )}
                    {selected.classes?.length ? (
                      <tr><td className="text-gold py-0.5 pr-2">Classes</td><td className="py-0.5">{selected.classes.join(', ')}</td></tr>
                    ) : null}
                  </tbody>
                </table>
                <p className="mt-3 text-sm whitespace-pre-line">{selected.description}</p>
                {selected.higher_level && (
                  <div className="mt-3 p-2 rounded bg-gold/5 border border-gold/20 text-sm">
                    <b className="text-gold">Aux niveaux supérieurs :</b>{' '}
                    <span className="whitespace-pre-line">{selected.higher_level}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onPick(toSheetSpell(selected))}
                  disabled={existingNames.has(selected.name)}
                  className="btn-rune w-full mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  {existingNames.has(selected.name) ? 'Déjà dans la fiche' : 'Ajouter à la fiche'}
                </button>
              </>
            ) : (
              <p className="italic text-muted-foreground text-center pt-16">
                Sélectionne un sort.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
