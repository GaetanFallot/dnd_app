import { useMemo, useState } from 'react';
import { useDndClasses, useDndSubclasses, useDndRaces, useDndBackgrounds } from '@/hooks/useDndData';
import type { DnDCharacter, DnDFeature, SpellType, AbilityKey } from '@/types/character';
import type { DndClassEntry, DndSubclassEntry, DndFeatureEntry } from '@/types/dnd';
import { cn } from '@/lib/utils';
import { X, Search } from 'lucide-react';

type Kind = 'class' | 'subclass' | 'race' | 'background';

interface Props {
  open: boolean;
  kind: Kind;
  onClose: () => void;
  onPick: (patch: Partial<DnDCharacter>) => void;
  classFilter?: string;
  existingFeatures: DnDFeature[];
  level: number;
}

const CLASS_ICONS: Record<string, string> = {
  barbarian: '🪓', bard: '🎵', cleric: '🕊️', druid: '🌿',
  fighter: '🗡️', monk: '👊', paladin: '⚔️', ranger: '🏹',
  rogue: '🎭', sorcerer: '🔥', warlock: '👁️', wizard: '📖',
};

const CLASS_NAMES = new Set([
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin',
  'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard', 'Barbare', 'Barde',
  'Clerc', 'Druide', 'Guerrier', 'Moine', 'Rôdeur', 'Roublard',
  'Ensorceleur', 'Sorcier', 'Magicien',
]);

const SPELL_TYPE_FOR_CLASS: Record<string, SpellType> = {
  bard: 'full', cleric: 'full', druid: 'full', sorcerer: 'full', wizard: 'full',
  paladin: 'half', ranger: 'half', artificer: 'half',
  warlock: 'warlock',
};

const SPELL_ABILITY_FOR_CLASS: Record<string, AbilityKey> = {
  bard: 'cha', cleric: 'wis', druid: 'wis', paladin: 'cha',
  ranger: 'wis', sorcerer: 'cha', warlock: 'cha', wizard: 'int',
};

function featuresFromEntry(entry: Record<string, unknown>, sourceLabel: string, level: number): DnDFeature[] {
  const raw = (entry.features as DndFeatureEntry[] | undefined) ?? [];
  return raw
    .filter((f) => !f.level || f.level <= level)
    .map((f) => ({
      name: f.name,
      source: sourceLabel,
      description: f.description ?? '',
    }));
}

export function ClassPicker({ open, kind, onClose, onPick, classFilter, existingFeatures, level }: Props) {
  const classes = useDndClasses();
  const subclasses = useDndSubclasses();
  const races = useDndRaces();
  const backgrounds = useDndBackgrounds();
  const [search, setSearch] = useState('');

  const entries = useMemo(() => {
    const data = (
      kind === 'class' ? classes.data
      : kind === 'subclass' ? subclasses.data
      : kind === 'race' ? races.data
      : backgrounds.data
    ) ?? [];
    const q = search.trim().toLowerCase();
    return data.filter((entry) => {
      const name = String((entry as { name?: string }).name ?? '');
      if (q && !name.toLowerCase().includes(q)) return false;
      if (kind === 'subclass' && classFilter) {
        const klass = String((entry as DndSubclassEntry).class ?? '').toLowerCase();
        if (klass !== classFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [kind, search, classes.data, subclasses.data, races.data, backgrounds.data, classFilter]);

  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const apply = (entry: Record<string, unknown>) => {
    const name = String(entry.name ?? '');
    if (kind === 'class') {
      const slug = String(entry.slug ?? entry.index ?? '').toLowerCase();
      const icon = CLASS_ICONS[slug] ?? '🗡️';
      const hd = Number((entry as DndClassEntry).hit_die ?? (entry as DndClassEntry).hd ?? 8);
      const classFeatures = featuresFromEntry(entry, name, level);
      // Drop any previously injected features tagged with the old class source
      // (keeps user-authored features untouched).
      const kept = existingFeatures.filter((f) => f.source !== name && !CLASS_NAMES.has(f.source));
      onPick({
        _classId: slug,
        _className: name,
        _classIcon: icon,
        _hd: hd,
        _spellType: SPELL_TYPE_FOR_CLASS[slug] ?? 'none',
        _spellAbility: SPELL_ABILITY_FOR_CLASS[slug] ?? 'wis',
        _features: [...kept, ...classFeatures],
      });
    } else if (kind === 'race') {
      const raceFeatures = featuresFromEntry(entry, `Race: ${name}`, level);
      const kept = existingFeatures.filter((f) => !f.source.startsWith('Race: '));
      onPick({
        race: name,
        _features: raceFeatures.length ? [...kept, ...raceFeatures] : existingFeatures,
      });
    } else if (kind === 'background') {
      onPick({ background: name });
    } else if (kind === 'subclass') {
      const subclassFeatures = featuresFromEntry(entry, `${name} (sous-classe)`, level);
      // Strip previous subclass features — keep everything else (class / race / user).
      const kept = existingFeatures.filter((f) => !f.source.endsWith('(sous-classe)'));
      onPick({ _features: [...kept, ...subclassFeatures] });
    }
    onClose();
  };

  if (!open) return null;

  const title =
    kind === 'class' ? 'Choisir une classe'
    : kind === 'subclass' ? `Choisir une sous-classe${classFilter ? ` (${classFilter})` : ''}`
    : kind === 'race' ? 'Choisir une race'
    : 'Choisir un historique';

  return (
    <div className="fixed inset-0 z-40 bg-black/85 flex items-stretch justify-center p-4">
      <div className="panel flex flex-col w-full max-w-4xl max-h-full overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
          <h2 className="heading-rune text-lg flex-1">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-parchment">
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/60">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto border-r border-border/60">
            <ul className="divide-y divide-border/40">
              {entries.map((entry) => {
                const e = entry as Record<string, unknown>;
                const name = String(e.name ?? '');
                const slug = String(e.slug ?? e.index ?? name);
                const klass = kind === 'subclass' ? String(e.class ?? '') : '';
                return (
                  <li key={slug}>
                    <button
                      type="button"
                      onClick={() => setSelected(e)}
                      className={cn(
                        'w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gold/5',
                        selected?.slug === e.slug && 'bg-gold/10',
                      )}
                    >
                      <span className="font-display text-parchment flex-1 truncate">{name}</span>
                      {klass && <span className="text-xs text-muted-foreground">{klass}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="w-[360px] overflow-y-auto p-4 bg-night-deep/60">
            {selected ? (
              <>
                <h3 className="font-display text-gold text-lg">{String(selected.name ?? '')}</h3>
                {typeof selected.description === 'string' && selected.description && (
                  <p className="mt-2 text-sm whitespace-pre-line">{selected.description}</p>
                )}
                {typeof selected.desc === 'string' && selected.desc && (
                  <p className="mt-2 text-sm whitespace-pre-line">{String(selected.desc)}</p>
                )}
                <button type="button" onClick={() => apply(selected)} className="btn-rune w-full mt-4">
                  Choisir
                </button>
              </>
            ) : (
              <p className="italic text-muted-foreground text-center pt-16">
                Sélectionne une entrée.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
