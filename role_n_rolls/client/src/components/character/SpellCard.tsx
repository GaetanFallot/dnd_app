import type { DnDSpell } from '@/types/character';
import type { SpellAreaOfEffect } from '@/types/dnd';
import { ChipRow } from '@/components/shared/Chip';
import { buildSpellChips } from '@/lib/helpers/spellChips';
import { cn } from '@/lib/utils';

interface Props {
  spell: DnDSpell;
  /** Compact mode: title + level/school + V/S/M inline, no description.
   *  Full mode: hero + stat table + description + higher-level box. */
  compact?: boolean;
  /** Optional subtitle — used by the library preview to show the English name. */
  subtitle?: string;
  /** Current character level — highlights the current tier in the damage table. */
  characterLevel?: number;
  /** AoE lookup (keyed by slug) — fills in `area_of_effect` when the FR bundle
   *  dropped it. Only used when `spell.area_of_effect` is absent. */
  aoeMap?: Record<string, SpellAreaOfEffect>;
  className?: string;
}

function components(s: DnDSpell): string {
  const parts = [s.v && 'V', s.s && 'S', s.m && 'M'].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

function hydrateAoe(s: DnDSpell, aoeMap?: Record<string, SpellAreaOfEffect>): DnDSpell {
  if (s.area_of_effect || !aoeMap || !s.slug) return s;
  const aoe = aoeMap[s.slug];
  if (!aoe) return s;
  return { ...s, area_of_effect: aoe };
}

function sortedNumericKeys(obj: Record<string, string>): string[] {
  return Object.keys(obj).sort((a, b) => Number(a) - Number(b));
}

function currentCharacterTier(keys: string[], level: number): string | null {
  // Cantrips scale at fixed thresholds (commonly 1/5/11/17). We pick the
  // highest key that is <= the character level — that's the active tier.
  let best: string | null = null;
  for (const k of keys) {
    if (Number(k) <= level) best = k;
  }
  return best;
}

function SpellDamageTable({
  damage,
  spellLevel,
  characterLevel,
}: {
  damage: NonNullable<DnDSpell['damage']>;
  spellLevel: number;
  characterLevel?: number;
}) {
  const slot = damage.damage_at_slot_level;
  const byChar = damage.damage_at_character_level;
  const hasSlot = !!slot && Object.keys(slot).length > 0;
  const hasChar = !!byChar && Object.keys(byChar).length > 0;
  if (!hasSlot && !hasChar) return null;

  if (hasSlot && slot) {
    const keys = sortedNumericKeys(slot);
    const defaultSlot = String(spellLevel);
    return (
      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Dégâts par emplacement
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border/40 text-gold">
              <th className="text-left py-0.5 pr-2 font-display font-normal">Emplacement</th>
              <th className="text-left py-0.5 font-display font-normal">Dégâts</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => {
              const hi = k === defaultSlot;
              return (
                <tr
                  key={k}
                  className={cn(
                    'border-b border-border/20',
                    hi && 'bg-gold/10 text-gold',
                  )}
                >
                  <td className="py-0.5 pr-2">Niv. {k}</td>
                  <td className="py-0.5 font-mono">{slot[k]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if (hasChar && byChar) {
    const keys = sortedNumericKeys(byChar);
    const activeKey =
      typeof characterLevel === 'number' ? currentCharacterTier(keys, characterLevel) : null;
    return (
      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Dégâts par niveau du personnage
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border/40 text-gold">
              <th className="text-left py-0.5 pr-2 font-display font-normal">Niveau</th>
              <th className="text-left py-0.5 font-display font-normal">Dégâts</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => {
              const hi = k === activeKey;
              return (
                <tr
                  key={k}
                  className={cn(
                    'border-b border-border/20',
                    hi && 'bg-gold/10 text-gold',
                  )}
                >
                  <td className="py-0.5 pr-2">Niv. {k}+</td>
                  <td className="py-0.5 font-mono">{byChar[k]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}

export function SpellCard({ spell, compact, subtitle, characterLevel, aoeMap, className }: Props) {
  const s = hydrateAoe(spell, aoeMap);
  const chips = buildSpellChips(s, { characterLevel });

  if (compact) {
    return (
      <div className={cn('text-xs leading-snug', className)}>
        <div className="font-display text-gold leading-tight">{s.name}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground italic">{subtitle}</div>}
        <div className="text-[11px] text-muted-foreground italic">
          {s.level === 0 ? 'Tour de magie' : `Niveau ${s.level}`}
          {s.school ? ` — ${s.school}` : ''}
          <span className="ml-2 text-parchment/80 not-italic">{components(s)}</span>
          {s.m && s.material && (
            <span className="text-muted-foreground italic"> ({s.material})</span>
          )}
        </div>
        <ChipRow chips={chips} />
      </div>
    );
  }

  return (
    <div className={cn('text-sm leading-relaxed', className)}>
      <h3 className="font-display text-gold text-lg leading-tight">{s.name}</h3>
      {subtitle && (
        <div className="text-[11px] text-muted-foreground italic">{subtitle}</div>
      )}
      <div className="text-xs text-muted-foreground italic">
        {s.level === 0 ? 'Tour de magie' : `Niveau ${s.level}`}
        {s.school ? ` — ${s.school}` : ''}
      </div>
      <ChipRow chips={chips} />

      <table className="w-full mt-3 text-xs border-collapse">
        <tbody>
          {s.casting_time && (
            <tr className="border-b border-border/30">
              <td className="text-gold py-0.5 pr-2 w-[45%]">Temps d'incantation</td>
              <td className="py-0.5">{s.casting_time}</td>
            </tr>
          )}
          {s.range && (
            <tr className="border-b border-border/30">
              <td className="text-gold py-0.5 pr-2">Portée</td>
              <td className="py-0.5">{s.range}</td>
            </tr>
          )}
          <tr className="border-b border-border/30">
            <td className="text-gold py-0.5 pr-2">Composantes</td>
            <td className="py-0.5">
              {components(s)}
              {s.m && s.material && (
                <div className="text-muted-foreground italic text-[11px]">
                  Matériel : {s.material}
                </div>
              )}
            </td>
          </tr>
          {s.duration && (
            <tr className="border-b border-border/30">
              <td className="text-gold py-0.5 pr-2">Durée</td>
              <td className="py-0.5">{s.duration}</td>
            </tr>
          )}
          {s.classes?.length ? (
            <tr>
              <td className="text-gold py-0.5 pr-2">Classes</td>
              <td className="py-0.5">{s.classes.join(', ')}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {s.damage && (
        <SpellDamageTable
          damage={s.damage}
          spellLevel={s.level}
          characterLevel={characterLevel}
        />
      )}

      {s.summary && (
        <p className="mt-3 text-sm whitespace-pre-line">{s.summary}</p>
      )}
      {s.higher_level && (
        <div className="mt-3 p-2 rounded bg-gold/5 border border-gold/20 text-sm">
          <b className="text-gold">Aux niveaux supérieurs :</b>{' '}
          <span className="whitespace-pre-line">{s.higher_level}</span>
        </div>
      )}
    </div>
  );
}
