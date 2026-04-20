import { useMemo, useState } from 'react';
import { useDndSpells } from '@/hooks/useDndData';
import { useDndSpellsAoe } from '@/hooks/useDndSpellsAoe';
import type { DnDSpell } from '@/types/character';
import type { DndSpellEntry, SpellAreaOfEffect } from '@/types/dnd';
import { SPELL_SCHOOLS } from '@/lib/helpers/dndRules';
import { cn } from '@/lib/utils';
import { Search, X, Plus } from 'lucide-react';
import { SpellCard } from './SpellCard';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (spell: DnDSpell) => void;
  existingNames: Set<string>;
}

/** Convert an SRD/wikidot spell entry into the legacy DnDSpell shape. */
function toSheetSpell(entry: DndSpellEntry, aoe?: SpellAreaOfEffect): DnDSpell {
  const comp = entry.components ?? {};
  // loadDndBundle already coerces the empty-string case to undefined, so a
  // plain truthy check yields the "ranged"|"melee" subset.
  const attackType: 'ranged' | 'melee' | undefined =
    entry.attack_type === 'ranged' || entry.attack_type === 'melee' ? entry.attack_type : undefined;
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
    material: comp.material ?? (typeof entry.material === 'string' ? entry.material : undefined),
    concentration: entry.concentration,
    ritual: entry.ritual,
    classes: entry.classes,
    higher_level: entry.higher_level,
    name_en: entry.name_en,
    attack_type: attackType,
    damage: entry.damage ?? null,
    dc: entry.dc ?? null,
    area_of_effect: entry.area_of_effect ?? aoe ?? null,
    slug: entry.slug,
  };
}

export function SpellBrowser({ open, onClose, onPick, existingNames }: Props) {
  const { data = [], isLoading } = useDndSpells();
  const { data: aoeMap } = useDndSpellsAoe();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<string>('');
  const [school, setSchool] = useState('');
  const [selected, setSelected] = useState<DndSpellEntry | null>(null);

  const selectedAoe = selected && aoeMap ? aoeMap[selected.slug] : undefined;

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
                <SpellCard
                  spell={toSheetSpell(selected, selectedAoe)}
                  subtitle={
                    typeof selected.name_en === 'string' && selected.name_en && selected.name_en !== selected.name
                      ? String(selected.name_en)
                      : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => onPick(toSheetSpell(selected, selectedAoe))}
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
