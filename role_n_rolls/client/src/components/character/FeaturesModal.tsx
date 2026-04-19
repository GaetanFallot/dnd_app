import { useMemo, useState } from 'react';
import { useDndClasses } from '@/hooks/useDndData';
import type { DnDFeature } from '@/types/character';
import type { DndClassEntry } from '@/types/dnd';
import { X, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  existing: DnDFeature[];
  classId: string;
  className: string;
  level: number;
  onAdd: (features: DnDFeature[]) => void;
}

/**
 * Turn `"barbarian-unarmored-defense"` → `"Unarmored Defense"`.
 * The class bundle only ships slugs per level, so we humanize to give a
 * starting name; users can refine the label + description afterwards.
 */
function humanizeSlug(slug: string, classId: string): string {
  const prefix = classId.toLowerCase() + '-';
  const s = slug.toLowerCase().startsWith(prefix) ? slug.slice(prefix.length) : slug;
  return s
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface LevelFeature {
  slug: string;
  level: number;
  name: string;
  source: string;
  alreadyAdded: boolean;
}

export function FeaturesModal({ open, onClose, existing, classId, className, level, onAdd }: Props) {
  const { data: classes = [] } = useDndClasses();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState({ name: '', source: '', description: '' });

  const suggestions = useMemo<LevelFeature[]>(() => {
    if (!classId) return [];
    const klass = (classes as DndClassEntry[]).find(
      (c) => String(c.slug ?? c.index ?? '').toLowerCase() === classId.toLowerCase(),
    );
    if (!klass) return [];
    const levels = (klass as { levels?: Array<{ level: number; features?: string[] }> }).levels ?? [];
    const existingNames = new Set(existing.map((f) => f.name.toLowerCase()));
    const out: LevelFeature[] = [];
    for (const lvl of levels) {
      if (lvl.level > level) continue;
      for (const slug of lvl.features ?? []) {
        const name = humanizeSlug(slug, classId);
        out.push({
          slug,
          level: lvl.level,
          name,
          source: `${className} (niv. ${lvl.level})`,
          alreadyAdded: existingNames.has(name.toLowerCase()),
        });
      }
    }
    return out;
  }, [classes, classId, className, level, existing]);

  if (!open) return null;

  const toggle = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const confirm = () => {
    const additions: DnDFeature[] = suggestions
      .filter((s) => selected.has(s.slug))
      .map((s) => ({ name: s.name, source: s.source, description: '' }));

    if (custom.name.trim()) {
      additions.push({
        name: custom.name.trim(),
        source: custom.source.trim(),
        description: custom.description.trim(),
      });
    }
    if (additions.length) onAdd(additions);
    setSelected(new Set());
    setCustom({ name: '', source: '', description: '' });
    onClose();
  };

  const selectAllMissing = () => {
    setSelected(new Set(suggestions.filter((s) => !s.alreadyAdded).map((s) => s.slug)));
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/85 flex items-stretch justify-center p-4">
      <div className="panel flex flex-col w-full max-w-3xl max-h-full overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
          <h2 className="heading-rune text-lg flex-1">
            Aptitudes & Traits {className && <span className="text-muted-foreground text-sm normal-case">— {className} niv. {level}</span>}
          </h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-parchment">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {classId ? (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-display text-gold text-sm">
                  Proposées par la classe
                </h3>
                <span className="text-xs text-muted-foreground">({suggestions.length})</span>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={selectAllMissing}
                  className="text-xs text-gold hover:text-gold-light underline underline-offset-2"
                  disabled={!suggestions.some((s) => !s.alreadyAdded)}
                >
                  Tout cocher
                </button>
              </div>
              {suggestions.length === 0 ? (
                <p className="italic text-xs text-muted-foreground">
                  Pas de features listées pour cette classe dans les données 5e.
                </p>
              ) : (
                <ul className="space-y-1">
                  {suggestions.map((s) => (
                    <li
                      key={s.slug}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded border text-sm',
                        s.alreadyAdded
                          ? 'border-border/30 bg-night-deep/20 opacity-60'
                          : selected.has(s.slug)
                          ? 'border-gold bg-gold/5'
                          : 'border-border/60 hover:border-gold/40',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={s.alreadyAdded || selected.has(s.slug)}
                        disabled={s.alreadyAdded}
                        onChange={() => toggle(s.slug)}
                        className="accent-gold"
                      />
                      <span className="flex-1 font-display text-parchment">{s.name}</span>
                      <span className="text-[10px] text-muted-foreground">niv. {s.level}</span>
                      {s.alreadyAdded && (
                        <span className="text-[10px] text-gold/70 flex items-center gap-1">
                          <Check className="w-3 h-3" /> déjà
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <p className="italic text-xs text-muted-foreground">
              Choisis une classe dans le panneau Identité pour voir les suggestions.
            </p>
          )}

          <section className="pt-4 border-t border-border/40">
            <h3 className="font-display text-gold text-sm mb-2">Ajouter une aptitude manuelle</h3>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nom"
                value={custom.name}
                onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))}
                className="bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
              />
              <input
                type="text"
                placeholder="Source (race, objet…)"
                value={custom.source}
                onChange={(e) => setCustom((c) => ({ ...c, source: e.target.value }))}
                className="bg-input border border-border/60 rounded px-2 py-1 text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <textarea
              placeholder="Description (optionnelle)"
              value={custom.description}
              onChange={(e) => setCustom((c) => ({ ...c, description: e.target.value }))}
              rows={2}
              className="mt-2 w-full bg-input border border-border/60 rounded px-2 py-1 text-sm resize-y focus:outline-none focus:border-gold"
            />
          </section>
        </div>

        <footer className="flex items-center gap-2 px-4 py-3 border-t border-border/60">
          <span className="text-xs text-muted-foreground">
            {selected.size + (custom.name.trim() ? 1 : 0)} sélection(s)
          </span>
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="btn-rune text-xs">Annuler</button>
          <button
            type="button"
            onClick={confirm}
            disabled={!selected.size && !custom.name.trim()}
            className="btn-rune text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" /> Ajouter
          </button>
        </footer>
      </div>
    </div>
  );
}
